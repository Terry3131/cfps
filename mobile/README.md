# CFPS Mobile Companion

Lightweight Expo mobile app for read-only operational notifications and memo alerts.

## Run

```powershell
cd mobile
npm install
npm start
```

Expo starts in LAN mode by default. Scan the QR code with Expo Go on an Android phone connected to the same network as the CFPS server PC.

## API Configuration

The production default is:

```text
https://cfps-backend.onrender.com
```

Production builds require HTTPS and disable Android cleartext traffic. Local development builds may use a LAN API such as:

```text
http://192.168.1.50:5000
```

Replace `192.168.1.50` with the PC's LAN IPv4 address. Production can also use an HTTPS API gateway with an `/api` prefix, for example:

```text
https://cfps.example.mil/api
```

The selected base URL is stored locally with Expo SecureStore.
The mobile API client also performs a one-time 404 fallback between the selected base URL and its `/api` variant so gateway deployments are tolerated.

For Android LAN testing, the backend must listen on the network interface, not only localhost. Start the server with `HOST=0.0.0.0` if the phone cannot reach `http://PC-IP:5000/health`.

## Scope

Mobile v1 is notification-only:

- Login and restore JWT session.
- View notification center.
- Open read-only memo alert details.
- Mark one or all notifications as read.
- Review profile/session.
- Configure API base URL and theme mode.

It intentionally excludes memo create, edit, approve, release, validation, commencement, progress, and attachment workflow actions.
