# Mobile Testing Guide (Local Network)

To test the SteelFlex website on your mobile phone or other devices on your local Wi-Fi, follow these steps:

## 1. Prerequisites
- Your computer and your mobile device must be connected to the **same Wi-Fi network**.

## 2. Configuration (Already Done)
I have updated your `vite.config.js` to enable "Host" listening. This allows the development server to accept connections from other devices on your network.

## 3. How to Access
1.  **Find your Local IP Address**: 
    Your current local IP address is: `192.168.1.6`
2.  **Open your Mobile Browser**:
    Type the following URL into your mobile browser (Chrome, Safari, etc.):
    `http://192.168.1.6:5173/steelflex-web-development/src/website/index.html`

## 4. Troubleshooting
If the page doesn't load:
- **Firewall**: Your Windows Firewall might be blocking the connection. You may need to allow "Node.js" or "Vite" through your firewall settings.
- **Network Profile**: Ensure your Wi-Fi network profile on Windows is set to **"Private"** instead of "Public".
- **VPN**: If you are using a VPN on either your computer or mobile, turn it off.

## 5. Quick Command
If your IP address changes in the future, you can find it again by running this command in your terminal:
```powershell
ipconfig
```
Look for the **IPv4 Address** under the "Wireless LAN adapter Wi-Fi" section.
