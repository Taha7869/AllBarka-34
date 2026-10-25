# Customer authentication

AllBarka uses Firebase Authentication. The customer entry screen offers **Continue with Google** and **Continue with email**. Phone and SMS authentication are not offered.

## Customer flows

- **Continue with Google:** Firebase's Google popup signs in an existing Google identity or creates its Firebase account on first use. There is no separate Google signup form. After verified authentication, the same profile, session and guest-order recovery helpers run for either provider.
- **Continue with email:** opens the existing-account email/password sign-in form. Entering an email alone does not authenticate the customer or create an account. Firebase's enabled Email/Password provider requires the account password.
- **Create account:** opens a distinct signup form with name, email, password and password confirmation. The app validates these fields before calling Firebase `createUserWithEmailAndPassword`. Firebase owns account uniqueness and the authenticated identity; signup is not retried as an implicit login.
- **Forgot password:** requests Firebase's password-reset email. The result does not reveal whether an address has an account. A Google-only customer should use Continue with Google unless they have also established password credentials.
- **Back / switch method:** clears password fields and provider errors. Authentication never stores passwords or Google access tokens in the app's local storage.

An email/password signup collision asks the customer to sign in or reset their password. A provider collision remains an actionable Firebase error; the app does not guess account ownership from an email or silently link credentials. Existing customer profile fields are preserved. Optional profile/session/order recovery failures do not undo successful Firebase authentication, and pending guest-order claim keys are cleared only after the server confirms the claim.

## Real Firebase configuration

The supplied console screenshot shows Email/Password and Google enabled and Phone disabled. On 3 October 2026, the owner supplied the real public web-app configuration; it is now stored in the ignored local `.env.local` and compiled into the preview. The checked-in `firebase-applet-config.json` remains a template. Firebase's project-config endpoint accepted the supplied key and confirmed `localhost`, `allbarka-live.firebaseapp.com` and `allbarka-live.web.app` as authorized domains. `127.0.0.1` is not authorized, so use **http://localhost:4174/** for the local Google sign-in preview.

Production headers permit the required Google bootstrap script and this project's Firebase auth iframe, with an OAuth-compatible popup policy. Firebase Analytics is not enabled by this pass. Phone remains secondary contact/delivery information, not an authentication method. Server-only Firebase Admin credentials remain unconfigured locally.

1. In Firebase Console for `allbarka-live`, open **Project settings → Your apps → the AllBarka web app → SDK setup and configuration**.
2. Put that app's actual public web configuration into `.env.local` using the `VITE_FIREBASE_*` names shown in `.env.example`. At minimum the real API key, app ID, project ID and auth domain must match the Firebase web app.
3. Check **Authentication → Settings → Authorized domains** for the actual local/production host. New Firebase projects may need `localhost` explicitly added for local testing. Never bypass an unauthorized-domain error in application code.
4. Rebuild and restart the preview after changing Vite environment values. These values are compiled into the client bundle.
5. Configure the existing server-only Firebase Admin environment separately for verified server sessions, persisted orders and administration writes. Never put service-account credentials in `VITE_` variables or commit them.

Local browser checks can verify all screens, navigation, validation and honest unconfigured-service errors. A successful live OAuth/email login, signup or password-reset email requires the actual configuration and an owner-controlled account. No live account creation or email dispatch is implied by local mocked tests.

References: [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin).
