import { exec } from 'node:child_process';

export const watchSyncPlugin = {
  name: 'watch-sync-mock',
  configureServer(server: any) {
    server.middlewares.use('/api/sync-watch', (req: any, res: any) => {
      if (req.method !== 'POST') return;
      let body = '';
      req.on('data', (chunk: any) => body += chunk.toString());
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const adbPath = process.env.HOME ? `${process.env.HOME}/Library/Android/sdk/platform-tools/adb` : 'adb';
          let cmd = `${adbPath} shell am broadcast -a com.korfstat.UPDATE_STATE`;
          if (data.homeScore !== undefined) cmd += ` --ei homeScore ${data.homeScore}`;
          if (data.awayScore !== undefined) cmd += ` --ei awayScore ${data.awayScore}`;
          if (data.gameTime !== undefined) cmd += ` --el gameTime ${data.gameTime}`;
          if (data.shotClock !== undefined) cmd += ` --el shotClock ${data.shotClock}`;
          if (data.isGameTimeRunning !== undefined) cmd += ` --ez isGameTimeRunning ${data.isGameTimeRunning}`;
          if (data.isShotClockRunning !== undefined) cmd += ` --ez isShotClockRunning ${data.isShotClockRunning}`;
          if (data.period !== undefined) cmd += ` --ei period ${data.period}`;
          if (data.subPending !== undefined) cmd += ` --ez subPending ${data.subPending}`;
          if (data.latestSubId !== undefined) cmd += ` --es latestSubId "${data.latestSubId}"`;
          if (data.subOut !== undefined) cmd += ` --es subOut "${data.subOut}"`;
          if (data.subIn !== undefined) cmd += ` --es subIn "${data.subIn}"`;
          if (data.watchControlMode !== undefined) {
              const isReadOnly = data.watchControlMode === 'read-only';
              cmd += ` --ez isReadOnly ${isReadOnly}`;
          }
          
          const tTeam = data.timeoutTeam || "NONE";
          cmd += ` --es timeoutTeam "${tTeam}"`;
          
          if (data.hapticSignal !== undefined) {
              cmd += ` --es hapticSignal "${data.hapticSignal}"`;
          }
          if (data.hapticSignalId !== undefined) {
              cmd += ` --es hapticSignalId "${data.hapticSignalId}"`;
          }

          exec(cmd, (error) => {
            res.setHeader('Content-Type', 'application/json');
            if (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            } else {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            }
          });
        } catch(e) {
           res.statusCode = 400;
           res.end(JSON.stringify({ error: 'Bad Request' }));
        }
      });
    });
  }
};
