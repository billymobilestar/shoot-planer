import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var auth: AuthService
    @State private var projects: [Project] = []
    @State private var loading = true
    @State private var showNewProject = false
    @State private var newProjectName = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.ignoresSafeArea()

                if loading {
                    ProgressView().tint(Theme.accent)
                } else if projects.isEmpty {
                    emptyState
                } else {
                    projectList
                }
            }
            .navigationTitle("Projects")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showNewProject = true }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Theme.accent)
                            .font(.title3)
                    }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    Menu {
                        Button(role: .destructive, action: { auth.signOut() }) {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "person.circle.fill")
                            .foregroundColor(Theme.textSecondary)
                            .font(.title3)
                    }
                }
            }
            .alert("New Project", isPresented: $showNewProject) {
                TextField("Project name", text: $newProjectName)
                Button("Cancel", role: .cancel) { newProjectName = "" }
                Button("Create") { createProject() }
            }
            .task { await loadProjects() }
            .refreshable { await loadProjects() }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "film.stack")
                .font(.system(size: 48))
                .foregroundColor(Theme.textMuted)
            Text("No projects yet")
                .font(.title3)
                .foregroundColor(Theme.textSecondary)
            Text("Tap + to create your first shoot")
                .font(.subheadline)
                .foregroundColor(Theme.textMuted)
        }
    }

    private var projectList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(projects) { project in
                    NavigationLink(destination: ProjectDetailView(project: project)) {
                        ProjectCard(project: project)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
    }

    private func loadProjects() async {
        do {
            projects = try await APIService.shared.fetchProjects(token: auth.sessionToken)
        } catch {
            print("Failed to load projects: \(error)")
        }
        loading = false
    }

    private func createProject() {
        guard !newProjectName.isEmpty, let userId = auth.userId else { return }
        Task {
            do {
                let project = try await APIService.shared.createProject(
                    name: newProjectName, ownerId: userId, token: auth.sessionToken
                )
                projects.insert(project, at: 0)
                newProjectName = ""
            } catch {
                print("Failed to create project: \(error)")
            }
        }
    }
}

struct ProjectCard: View {
    let project: Project

    var body: some View {
        HStack(spacing: 16) {
            // Cover image or placeholder
            RoundedRectangle(cornerRadius: 8)
                .fill(Theme.accent.opacity(0.2))
                .frame(width: 56, height: 56)
                .overlay {
                    if let url = project.coverImageUrl, let imageURL = URL(string: url) {
                        AsyncImage(url: imageURL) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Image(systemName: "film")
                                .foregroundColor(Theme.accent)
                        }
                        .frame(width: 56, height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        Image(systemName: "film")
                            .foregroundColor(Theme.accent)
                    }
                }

            VStack(alignment: .leading, spacing: 4) {
                Text(project.name)
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                    .lineLimit(1)
                if let desc = project.description, !desc.isEmpty {
                    Text(desc)
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(2)
                }
                if let date = project.startDate {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(Theme.textMuted)
                }
            }

            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(Theme.textMuted)
        }
        .padding(16)
        .background(Theme.bgCard)
        .cornerRadius(Theme.cornerRadius)
    }
}
