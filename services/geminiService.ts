import { GoogleGenAI } from "@google/genai";
import { MatchState, SHOT_TYPES } from "../types";
import { getScore, formatTime } from "../utils/matchUtils";

const getClient = () => {
  // 1. Try to get from Local Storage (User Settings)
  let apiKey = '';
  try {
    const saved = localStorage.getItem('korfstat_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      apiKey = settings.geminiApiKey;
    }
  } catch (e) {
    console.warn("Failed to read settings for API key", e);
  }

  // 2. Fallback to Environment Variable
  if (!apiKey) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    throw new Error("Gemini API Key not found. Please enter it in Settings or configure VITE_GEMINI_API_KEY.");
  }

  return new GoogleGenAI({ apiKey });
};

export const generateMatchReport = async (matchData: MatchState): Promise<string> => {
  try {
    const ai = getClient();

    // Prepare a summary of the match for the prompt
    const homeGoals = matchData.events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
    const awayGoals = matchData.events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

    const summary = {
      score: `${matchData.homeTeam.name} ${homeGoals} - ${awayGoals} ${matchData.awayTeam.name}`,
      events_count: matchData.events.length,
      halftime: matchData.currentHalf,
      stats: matchData.events.map(e => ({
        time: `${Math.floor(e.timestamp / 60)}:${(e.timestamp % 60).toString().padStart(2, '0')}`,
        team: e.teamId === 'HOME' ? matchData.homeTeam.name : matchData.awayTeam.name,
        type: e.type,
        result: e.result,
        shotType: e.shotType,
        player: e.teamId === 'HOME'
          ? matchData.homeTeam.players.find(p => p.id === e.playerId)?.name
          : matchData.awayTeam.players.find(p => p.id === e.playerId)?.name
      }))
    };

    const prompt = `
      You are an expert Korfball analyst. Analyze the following match statistics JSON data and provide a tactical report.
      
      Match Data:
      ${JSON.stringify(summary, null, 2)}
      
      Please provide:
      1. A brief summary of the game flow.
      2. Key performance indicators for both teams (shooting efficiency, rebound dominance).
      3. Standout players based on the stats. Look at both the positive and negative standout players
      4. Tactical advice for both teams
      
      Keep the tone professional and constructive. Use Markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Error generating match report:", error);
    return "Error generating report. Please ensure your API key is configured correctly.";
  }
};

export const generateStrategyReport = async (teamA: string, teamB: string, matches: MatchState[]): Promise<string> => {
  try {
    const ai = getClient();

    // Filter relevant matches
    const relevantMatches = matches.filter(m =>
      (m.homeTeam.name === teamA && m.awayTeam.name === teamB) ||
      (m.homeTeam.name === teamB && m.awayTeam.name === teamA)
    );

    if (relevantMatches.length === 0) {
      return `No previous match data found between ${teamA} and ${teamB}. Cannot generate specific strategy based on history.`;
    }

    // Summarize stats from previous encounters
    const summary = relevantMatches.map(m => {
      const isHomeA = m.homeTeam.name === teamA;
      const teamAId = isHomeA ? 'HOME' : 'AWAY';
      const teamBId = isHomeA ? 'AWAY' : 'HOME';

      const goalsA = m.events.filter(e => e.teamId === teamAId && e.result === 'GOAL').length;
      const goalsB = m.events.filter(e => e.teamId === teamBId && e.result === 'GOAL').length;
      const shotsA = m.events.filter(e => e.teamId === teamAId && e.type === 'SHOT').length;
      const shotsB = m.events.filter(e => e.teamId === teamBId && e.type === 'SHOT').length;

      return {
        date: new Date(m.date || Date.now()).toLocaleDateString(),
        score: `${teamA} ${goalsA} - ${goalsB} ${teamB}`,
        stats: {
          [teamA]: { goals: goalsA, shots: shotsA, efficiency: shotsA ? Math.round(goalsA / shotsA * 100) : 0 },
          [teamB]: { goals: goalsB, shots: shotsB, efficiency: shotsB ? Math.round(goalsB / shotsB * 100) : 0 }
        }
      };
    });

    const prompt = `
            You are a Korfball coach preparing a strategy for an upcoming match between ${teamA} and ${teamB}.
            Based on the following history of matches between these two teams, outline a winning strategy for ${teamA}.

            Match History:
            ${JSON.stringify(summary, null, 2)}

            Please provide:
            1. Analysis of previous encounters (scores, trends).
            2. Identified weak points of ${teamB} based on the stats.
            3. Identified strong points of ${teamA} to leverage.
            4. Specific tactical instructions (e.g., focus on rebounding, tight defense, long shots).

            Format the response in Markdown.
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || "No strategy could be generated.";

  } catch (error) {
    console.error("Error generating strategy:", error);
    return "Error generating strategy. Please check your API key.";
  }
}

export const generateLiveCommentary = async (matchData: MatchState): Promise<string> => {
  try {
    const ai = getClient();

    // Get last 5 events
    const recentEvents = matchData.events.slice(-5).map(e => {
      const teamName = e.teamId === 'HOME' ? matchData.homeTeam.name : matchData.awayTeam.name;
      const player = e.teamId === 'HOME'
        ? matchData.homeTeam.players.find(p => p.id === e.playerId)
        : matchData.awayTeam.players.find(p => p.id === e.playerId);

      return `${formatTime(e.timestamp)} - ${teamName} - ${player?.name || 'Unknown'} - ${e.type} ${e.result || ''} ${e.shotType || ''}`;
    });

    const score = `${matchData.homeTeam.name} ${getScore(matchData, 'HOME')} - ${getScore(matchData, 'AWAY')} ${matchData.awayTeam.name}`;

    const prompt = `
            You are an exciting Korfball commentator. 
            Based on the current score (${score}) and the last few events, generate a short, engaging commentary snippet (max 2 sentences).
            Focus on the most recent significant event. Use the present tense.
            
            Recent Events:
            ${recentEvents.join('\n')}
            
            Commentary:
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Updated to faster model for live feel if available, else standard
      contents: prompt,
    });

    return response.text?.trim() || "Match is heating up!";
  } catch (error: any) {
    console.error("Error generating commentary:", error);
    if (error.message && error.message.includes('429')) {
      return "Quota exceeded. Try a different model in Settings.";
    }
    return "Technical timeout on the commentary box...";
  }
};