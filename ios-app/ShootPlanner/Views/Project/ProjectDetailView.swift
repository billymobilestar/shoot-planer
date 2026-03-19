import SwiftUI

struct ProjectDetailView: View {
    @EnvironmentObject var auth: AuthService
    let project: Project
    @State private var selectedTab = 0
    @State private var days: [ShootDay] = []
    @State private var shots: [Shot] = []
    @State private var loading = true

    private let tabs = ["Itinerary", "Shots", "Scenes", "Refs", "Team"]

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            VStack(spacing: 0) {
                // Tab bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 0) {
                        ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                            Button(action: { withAnimation { selectedTab = index } }) {
                                VStack(spacing: 8) {
                                    Text(tab)
                                        .font(.subheadline)
                                        .fontWeight(selectedTab == index ? .semibold : .regular)
                                        .foregroundColor(selectedTab == index ? Theme.accent : Theme.textSecondary)
                                    Rectangle()
                                        .fill(selectedTab == index ? Theme.accent : Color.clear)
                                        .frame(height: 2)
                                }
                                .padding(.horizontal, 16)
                            }
                        }
                    }
                    .padding(.horizontal, 8)
                }
                .frame(height: 44)
                .background(Theme.bgCard)

                // Content
                TabView(selection: $selectedTab) {
                    ItineraryView(days: $days, projectId: project.id)
                        .tag(0)
                    ShotListView(shots: $shots, projectId: project.id)
                        .tag(1)
                    PlaceholderTabView(title: "Scenes", icon: "doc.text")
                        .tag(2)
                    PlaceholderTabView(title: "References", icon: "photo.on.rectangle")
                        .tag(3)
                    PlaceholderTabView(title: "Team", icon: "person.3")
                        .tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await loadData() }
    }

    private func loadData() async {
        do {
            async let daysResult = APIService.shared.fetchDays(projectId: project.id, token: auth.sessionToken)
            async let shotsResult = APIService.shared.fetchShots(projectId: project.id, token: auth.sessionToken)
            days = try await daysResult
            shots = try await shotsResult
        } catch {
            print("Failed to load project data: \(error)")
        }
        loading = false
    }
}

struct PlaceholderTabView: View {
    let title: String
    let icon: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(Theme.textMuted)
            Text(title)
                .font(.title3)
                .foregroundColor(Theme.textSecondary)
            Text("Coming soon")
                .font(.subheadline)
                .foregroundColor(Theme.textMuted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bgPrimary)
    }
}
