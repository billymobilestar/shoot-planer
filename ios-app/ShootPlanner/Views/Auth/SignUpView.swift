import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) private var dismiss
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 60)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Create Account")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(Theme.accent)
                        Text("Start planning your shoots")
                            .font(.body)
                            .foregroundColor(Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.bottom, 40)

                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("First name")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                TextField("John", text: $firstName)
                                    .textFieldStyle(AppTextFieldStyle())
                                    .textContentType(.givenName)
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Last name")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                TextField("Doe", text: $lastName)
                                    .textFieldStyle(AppTextFieldStyle())
                                    .textContentType(.familyName)
                            }
                        }

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
                                .textContentType(.newPassword)
                        }

                        Button(action: handleSignUp) {
                            Group {
                                if loading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Sign Up")
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

                    HStack(spacing: 4) {
                        Text("Already have an account?")
                            .foregroundColor(Theme.textMuted)
                        Button("Sign in") { dismiss() }
                            .foregroundColor(Theme.accent)
                            .fontWeight(.medium)
                    }
                    .font(.subheadline)
                    .padding(.top, 32)
                }
                .padding(.horizontal, 24)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.left")
                        .foregroundColor(Theme.textPrimary)
                }
            }
        }
    }

    private func handleSignUp() {
        loading = true
        errorMessage = nil
        Task {
            do {
                try await auth.signUp(
                    email: email,
                    password: password,
                    firstName: firstName.isEmpty ? nil : firstName,
                    lastName: lastName.isEmpty ? nil : lastName
                )
            } catch {
                errorMessage = error.localizedDescription
            }
            loading = false
        }
    }
}
