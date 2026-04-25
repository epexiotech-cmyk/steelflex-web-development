const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function authorize() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ oauth-credentials.json not found!');
        return;
    }

    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('\n🚀 AUTHORIZATION REQUIRED');
    console.log('1. Open this URL in your browser:\n', authUrl);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('\n2. Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('❌ Error retrieving access token', err);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('\n✅ Success! token.json has been created.');
            console.log('You can now close this script.');
        });
    });
}

authorize();
