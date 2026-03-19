import FtpDeploy from 'ftp-deploy';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ftpDeploy = new FtpDeploy();

const config = {
    user: process.env.FTP_USER,
    // Password optional, prompted if none given
    password: process.env.FTP_PASSWORD,
    host: process.env.FTP_HOST,
    port: 21,
    localRoot: path.join(__dirname, '../dist'),
    remoteRoot: process.env.FTP_REMOTE_ROOT || '/public_html',
    // include: ["*", "**/*"],      // this would upload everything except dot files
    include: ["*", "**/*"],
    // exclude: ["dist/**/*.map", "node_modules/**", "node_modules/**/.*", ".git/**"],
    exclude: [],
    // delete remote before upload
    deleteRemote: false,
    // Passive mode is forced (EPSV command is not sent)
    forcePasv: true,
    // use sftp or ftp
    sftp: false,
};

if (!config.host || !config.user || !config.password) {
    console.error('❌ Error: FTP_HOST, FTP_USER, and FTP_PASSWORD must be set in your .env file.');
    process.exit(1);
}

console.log(`🚀 Starting deployment to ${config.host}...`);
console.log(`📁 Local Root: ${config.localRoot}`);
console.log(`🌐 Remote Root: ${config.remoteRoot}`);

ftpDeploy
    .deploy(config)
    .then((res) => console.log('✅ Deployment finished successfully!'))
    .catch((err) => {
        console.error('❌ Deployment error:', err);
        process.exit(1);
    });

ftpDeploy.on('uploading', (data) => {
    console.log(`📤 Uploading: ${data.transferredFileCount} / ${data.totalFilesCount} - ${data.filename}`);
});

ftpDeploy.on('uploaded', (data) => {
    // console.log(`✅ Uploaded: ${data.filename}`);
});

ftpDeploy.on('log', (msg) => {
    console.log(msg);
});

ftpDeploy.on('upload-error', (data) => {
    console.error(`❌ Upload error for ${data.filename}:`, data.err);
});
