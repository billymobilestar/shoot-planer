import SwiftUI
import AuthenticationServices
import os

struct SignInView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var googleLoading = false
    @State private var errorMessage: String?
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        Spacer().frame(height: 100)

                        // Logo
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Shoot Planner")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(Theme.accent)
                            Text("Sign in to your account")
                                .font(.body)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.bottom, 40)

                        // Google OAuth
                        Button(action: handleGoogleSignIn) {
                            HStack(spacing: 10) {
                                if googleLoading {
                                    ProgressView().tint(Theme.textPrimary)
                                } else {
                                    Image(systemName: "globe")
                                        .font(.system(size: 18))
                                    Text("Continue with Google")
                                        .fontWeight(.medium)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Theme.bgInput)
                            .foregroundColor(Theme.textPrimary)
                            .cornerRadius(Theme.cornerRadius)
                            .overlay(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                                    .stroke(Theme.border, lineWidth: 1)
                            )
                        }
                        .disabled(googleLoading)
                        .opacity(googleLoading ? 0.6 : 1)
                        .padding(.bottom, 24)

                        // Divider
                        HStack {
                            Rectangle().fill(Theme.border).frame(height: 1)
                            Text("or")
                                .font(.footnote)
                                .foregroundColor(Theme.textMuted)
                                .padding(.horizontal, 16)
                            Rectangle().fill(Theme.border).frame(height: 1)
                        }
                        .padding(.bottom, 24)

                        // Email/Password
                        VStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                TextField("you@example.com", text: $email)
                                    .textFieldStyle(AppTextFieldStyle())
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .keyboardType(.emailAddress)
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                SecureField("••••••••", text: $password)
                                    .textFieldStyle(AppTextFieldStyle())
                                    .textContentType(.password)
                            }

                            Button(action: handleSignIn) {
                                Group {
                                    if loading {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Sign In")
                                            .fontWeight(.semibold)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Theme.accent)
                                .foregroundColor(.white)
                                .cornerRadius(Theme.cornerRadius)
                            }
                            .disabled(loading || email.isEmpty || password.isEmpty)
                            .opacity(loading || email.isEmpty || password.isEmpty ? 0.6 : 1)
                            .padding(.top, 8)
                        }

                        if let error = errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundColor(.red)
                                .padding(.top, 12)
                        }

                        // Footer
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .foregroundColor(Theme.textMuted)
                            Button("Sign up") { showSignUp = true }
                                .foregroundColor(Theme.accent)
                                .fontWeight(.medium)
                        }
                        .font(.subheadline)
                        .padding(.top, 32)
                    }
                    .padding(.horizontal, 24)
                }
            }
            .navigationDestination(isPresented: $showSignUp) {
                SignUpView()
            }
        }
    }

    private func handleGoogleSignIn() {
        googleLoading = true
        errorMessage = nil
        Task {
            do {
                guard let window = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first?.windows.first else { return }
                try await auth.signInWithGoogle(from: window)
            } catch {
                let msg = error.localizedDescription
                os_log(.error, "AUTH ERROR: Google sign-in failed: %{public}@", msg)
                os_log(.error, "AUTH ERROR full: %{public}@", String(describing: error))
                errorMessage = msg
            }
            googleLoading = false
        }
    }

    private func handleSignIn() {
        loading = true
        errorMessage = nil
        Task {
            do {
                try await auth.signIn(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
            }
            loading = false
        }
    }
}

// MARK: - Custom TextField Style

struct AppTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Theme.bgInput)
            .foregroundColor(Theme.textPrimary)
            .cornerRadius(Theme.cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                    .stroke(Theme.border, lineWidth: 1)
            )
    }
}
