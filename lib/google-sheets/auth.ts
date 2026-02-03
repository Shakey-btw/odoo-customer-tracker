import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

let auth: GoogleAuth | null = null;

export function getGoogleAuth(): GoogleAuth {
  if (!auth) {
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS?.trim();

    if (!credentials) {
      throw new Error(
        "Missing Google Sheets credentials. " +
        "Please set GOOGLE_SHEETS_CREDENTIALS environment variable with your service account JSON."
      );
    }

    try {
      const credentialsJson = JSON.parse(credentials);

      auth = new google.auth.GoogleAuth({
        credentials: credentialsJson,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
      });
    } catch (error) {
      throw new Error(
        "Failed to parse GOOGLE_SHEETS_CREDENTIALS. " +
        "Ensure it contains valid JSON from your service account key file."
      );
    }
  }

  return auth;
}

export async function getSheetsClient() {
  const authClient = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth: authClient });
  return sheets;
}
