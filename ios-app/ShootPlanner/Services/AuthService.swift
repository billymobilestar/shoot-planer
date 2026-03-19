import SwiftUI
import AuthenticationServices
import os

private let logger = Logger(subsystem: "com.shootplanner.app", category: "auth")

@MainActor
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var userId: String?
    @Published var userEmail: String?
    @Published var userName: String?
    @Published var userAvatarUrl: String?
    @Published var sessionToken: String?

    private let tokenKey = "clerk_session_token"
    private let userIdKey = "clerk_user_id"

    init() {
        loadSavedSession()
    }

    private func loadSavedSession() {
        if let token = KeychainHelper.load(key: tokenKey),
           let uid = UserDefaults.standard.string(forKey: userIdKey) {
            self.sessionToken = token
            self.userId = uid
            self.isAuthenticated = true
        }
        isLoading = false
    }

    /// Sign in via Google OAuth — opens web app sign-in page which handles OAuth
    /// and redirects back to the native app with a session token
    func signInWithGoogle(from anchor: ASPresentationAnchor) async throws {
        let redirectScheme = "shootplanner"
        let callbackURL = "\(redirectScheme)://oauth-callback"
        let webSignInURL = "\(Config.apiBaseURL)/sign-in?redirect_url=\(callbackURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? callbackURL)"

        guard let url = URL(string: webSignInURL) else {
            throw AuthError.clerkError("Invalid sign-in URL")
        }

        logger.info("Opening web sign-in: \(webSignInURL)")

        let resultURL = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: redirectScheme
            ) { url, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else if let url = url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: AuthError.unknown)
                }
            }
            session.presentationContextProvider = WebAuthContextProvider(anchor: anchor)
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }

        try await handleOAuthCallback(resultURL)
    }

    /// Sign in with email/password via Clerk
    func signIn(email: String, password: String) async throws {
        let clerkDomain = extractClerkDomain()

        // Step 1: Create sign-in
        var request = URLRequest(url: URL(string: "https://\(clerkDomain)/v1/client/sign_ins")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "identifier": email,
            "password": password,
            "strategy": "password"
        ])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.networkError
        }

        if httpResponse.statusCode >= 400 {
            let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let errors = errorBody?["errors"] as? [[String: Any]]
            let message = errors?.first?["message"] as? String ?? "Sign in failed"
            throw AuthError.clerkError(message)
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let clientResponse = json?["response"] as? [String: Any] ?? json?["client"] as? [String: Any] else {
            // Try to extract session directly
            try extractSession(from: json, httpResponse: httpResponse)
            return
        }

        try extractSession(from: json, httpResponse: httpResponse)
    }

    /// Sign up with email/password via Clerk
    func signUp(email: String, password: String, firstName: String?, lastName: String?) async throws {
        let clerkDomain = extractClerkDomain()

        var body: [String: Any] = [
            "email_address": email,
            "password": password,
        ]
        if let firstName = firstName, !firstName.isEmpty { body["first_name"] = firstName }
        if let lastName = lastName, !lastName.isEmpty { body["last_name"] = lastName }

        var request = URLRequest(url: URL(string: "https://\(clerkDomain)/v1/client/sign_ups")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.networkError
        }

        if httpResponse.statusCode >= 400 {
            let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let errors = errorBody?["errors"] as? [[String: Any]]
            let message = errors?.first?["message"] as? String ?? "Sign up failed"
            throw AuthError.clerkError(message)
        }

        try extractSession(from: try JSONSerialization.jsonObject(with: data) as? [String: Any], httpResponse: httpResponse)
    }

    func signOut() {
        sessionToken = nil
        userId = nil
        userEmail = nil
        userName = nil
        userAvatarUrl = nil
        isAuthenticated = false
        KeychainHelper.delete(key: tokenKey)
        UserDefaults.standard.removeObject(forKey: userIdKey)
    }

    // MARK: - Helpers

    private func extractClerkDomain() -> String {
        // Decode publishable key to get clerk domain
        // pk_test_bWludC1oYW1zdGVyLTYuY2xlcmsuYWNjb3VudHMuZGV2JA -> mint-hamster-6.clerk.accounts.dev
        let key = Config.clerkPublishableKey
        let base64Part = String(key.dropFirst(8)) // Remove "pk_test_"
        // Add padding if needed
        var padded = base64Part
        while padded.count % 4 != 0 { padded += "=" }
        if let data = Data(base64Encoded: padded),
           var domain = String(data: data, encoding: .utf8) {
            // Remove trailing "$"
            if domain.hasSuffix("$") { domain = String(domain.dropLast()) }
            return domain
        }
        return "mint-hamster-6.clerk.accounts.dev"
    }

    private func handleOAuthCallback(_ url: URL) async throws {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw AuthError.invalidCallback
        }

        // Check for session token in callback params
        if let token = components.queryItems?.first(where: { $0.name == "__clerk_created_session" })?.value
            ?? components.queryItems?.first(where: { $0.name == "session_token" })?.value {
            self.sessionToken = token
            KeychainHelper.save(key: tokenKey, value: token)
            self.isAuthenticated = true
            return
        }

        // If no token in URL, poll Clerk client to get the active session
        let clerkDomain = extractClerkDomain()
        var clientRequest = URLRequest(url: URL(string: "https://\(clerkDomain)/v1/client?_clerk_js_version=5")!)
        clientRequest.httpMethod = "GET"
        let (data, _) = try await URLSession.shared.data(for: clientRequest)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        if let response = json?["response"] as? [String: Any],
           let sessions = response["sessions"] as? [[String: Any]],
           let activeSession = sessions.first(where: { ($0["status"] as? String) == "active" }) {
            if let lastToken = activeSession["last_active_token"] as? [String: Any],
               let jwt = lastToken["jwt"] as? String {
                self.sessionToken = jwt
                KeychainHelper.save(key: tokenKey, value: jwt)
            }
            if let user = activeSession["user"] as? [String: Any] {
                self.userId = user["id"] as? String
                if let uid = self.userId {
                    UserDefaults.standard.set(uid, forKey: userIdKey)
                }
                self.userName = [
                    user["first_name"] as? String,
                    user["last_name"] as? String
                ].compactMap { $0 }.joined(separator: " ")
                if let emails = user["email_addresses"] as? [[String: Any]] {
                    self.userEmail = emails.first?["email_address"] as? String
                }
                self.userAvatarUrl = user["image_url"] as? String
            }
            self.isAuthenticated = true
        } else {
            throw AuthError.noSession
        }
    }

    private func extractSession(from json: [String: Any]?, httpResponse: HTTPURLResponse) throws {
        // Look for session token in response or cookies
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies where cookie.name.contains("__session") || cookie.name.contains("__client") {
                self.sessionToken = cookie.value
                KeychainHelper.save(key: tokenKey, value: cookie.value)
            }
        }

        // Try to find user info in the response
        if let response = json?["response"] as? [String: Any],
           let client = response["client"] as? [String: Any] ?? json?["client"] as? [String: Any] {
            if let sessions = client["sessions"] as? [[String: Any]],
               let activeSession = sessions.first {
                if let lastToken = activeSession["last_active_token"] as? [String: Any],
                   let jwt = lastToken["jwt"] as? String {
                    self.sessionToken = jwt
                    KeychainHelper.save(key: tokenKey, value: jwt)
                }
                if let user = activeSession["user"] as? [String: Any] {
                    self.userId = user["id"] as? String
                    if let uid = self.userId {
                        UserDefaults.standard.set(uid, forKey: userIdKey)
                    }
                    self.userName = [
                        user["first_name"] as? String,
                        user["last_name"] as? String
                    ].compactMap { $0 }.joined(separator: " ")
                    if let emails = user["email_addresses"] as? [[String: Any]] {
                        self.userEmail = emails.first?["email_address"] as? String
                    }
                    self.userAvatarUrl = user["image_url"] as? String
                }
            }
        }

        if sessionToken != nil {
            isAuthenticated = true
        } else {
            throw AuthError.noSession
        }
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case networkError
    case clerkError(String)
    case invalidCallback
    case noSession
    case unknown

    var errorDescription: String? {
        switch self {
        case .networkError: return "Network error. Please check your connection."
        case .clerkError(let msg): return msg
        case .invalidCallback: return "Invalid authentication response."
        case .noSession: return "Could not create session."
        case .unknown: return "An unknown error occurred."
        }
    }
}

// MARK: - Web Auth Context Provider

class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    let anchor: ASPresentationAnchor
    init(anchor: ASPresentationAnchor) { self.anchor = anchor }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}

// MARK: - Keychain Helper

enum KeychainHelper {
    static func save(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
