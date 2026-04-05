import { GoogleGenAI } from "@google/genai";
import { MatchState, SHOT_TYPES } from "../types";
import { PlayerStats, TrendPoint } from "../types/stats";
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

export const generateScoutingReport = async (data: any): Promise<string> => {
    try {
        const ai = getClient();

        const prompt = `
            You are a high-level Korfball scout. Analyze the following aggregated data for [${data.teamName}] from their last ${data.matchCount} matches.
            
            Team Data Summary:
            - Average Goals per Game: ${data.avgGoals.toFixed(1)}
            - Shooting Efficiency (Overall): ${data.shootingEfficiency.total}%
            - Shooting Breakdown:
                * Near Post: ${data.shootingEfficiency.near}%
                * Medium Distance: ${data.shootingEfficiency.medium}%
                * Long Distance (Far): ${data.shootingEfficiency.far}%
                * Penalty: ${data.shootingEfficiency.penalty}%
                * Free Throw: ${data.shootingEfficiency.freeThrow}%
                * Running-in: ${data.shootingEfficiency.runningIn}%
            - Post Control: Average ${data.rebounds.avgPerGame.toFixed(1)} rebounds per match.
            - Discipline: Average ${data.fouls.avgPerGame.toFixed(1)} fouls per match.
            - Momentum Profile: 
                * First Half Goals: ${data.momentum.firstHalfGoals}
                * Second Half Goals: ${data.momentum.secondHalfGoals}
            
            Key Personnel Analyzed:
            ${data.topPlayers.map((p: any) => `- ${p.name}: ${p.goals} goals, ${p.shots} shots, efficiency: ${p.shots ? Math.round(p.goals/p.shots*100) : 0}%. Performance Rating (VAL): ${p.val}`).join('\n')}

            Please provide a professional Scouting Report in Markdown format with the following sections:
            1. EXECUTIVE SUMMARY: One paragraph describing their tactical identity (e.g., "A high-intensity team that forces play near the post").
            2. PERSONNEL ALERT: Highlight 2-3 specific players and how to neutralize them.
            3. SHOT MAP INSIGHTS: Analyze their preferred scoring zones and suggest how to position defense.
            4. DEFENSIVE GAPS: Identify their vulnerabilities based on foul count and momentum.
            5. TACTICAL VERDICT: Final advice to the coaching staff on how to secure a win.

            Tone: Professional, expert, and actionable.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        return response.text || "Could not generate scouting insights.";
    } catch (error) {
        console.error("Error generating scouting report:", error);
        return "The scouting drone encountered technical interference. Check your API key or data availability.";
    }
};

export const generatePlayerCareerBio = async (player: any, stats: PlayerStats, trend: TrendPoint[]): Promise<string> => {
    try {
        const ai = getClient();

        const prompt = `
            You are a professional sports biographer and korfball scout. Create a compelling, 2-paragraph career biography for the following player based on their statistics.

            Player: ${player.firstName} ${player.lastName} (Shirt #${player.shirtNumber})
            
            Career Totals:
            - Matches Played: ${stats.matchesPlayed}
            - Total Goals: ${stats.goals}
            - Shooting Accuracy: ${stats.shootingPercentage}%
            - Match Record: ${stats.wins}W - ${stats.draws}D - ${stats.losses}L
            - Milestones: ${stats.milestones.map(m => `${m.tier} ${m.type} (Value: ${m.value})`).join(', ')}

            Recent Performance Trend (Last 5 matches):
            ${trend.slice(-5).map(t => `- vs ${t.opponent}: ${t.goals} goals, ${t.accuracy}% accuracy (${t.result})`).join('\n')}

            Requirements:
            1. Paragraph 1: Focus on their overall career impact and consistency. Mention their primary milestones.
            2. Paragraph 2: Analyze their recent form and tactical profile (e.g., "clutch finisher," "efficient shooter"). 
            3. Tone: Inspiring and professional. Suitable for a club website or a scouting portal.
            4. Format: Plain text with two clear paragraphs.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        return response.text || "No biography could be generated at this time.";
    } catch (error) {
        console.error("Error generating player bio:", error);
        return "The AI biographer is currently unavailable. Please check your API key in Settings.";
    }
};