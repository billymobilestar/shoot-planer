import SwiftUI

struct ShotListView: View {
    @EnvironmentObject var auth: AuthService
    @Binding var shots: [Shot]
    let projectId: UUID
    @State private var showAddShot = false
    @State private var newShotTitle = ""

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            if shots.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "camera.viewfinder")
                        .font(.system(size: 48))
                        .foregroundColor(Theme.textMuted)
                    Text("No shots yet")
                        .foregroundColor(Theme.textSecondary)
                    Button("Add Shot") { showAddShot = true }
                        .buttonStyle(AccentButtonStyle())
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(shots) { shot in
                            ShotCard(shot: shot) { newStatus in
                                updateShotStatus(shot: shot, status: newStatus)
                            }
                        }

                        Button(action: { showAddShot = true }) {
                            HStack {
                                Image(systemName: "plus")
                                Text("Add Shot")
                            }
                            .font(.subheadline)
                            .foregroundColor(Theme.accent)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Theme.accent.opacity(0.1))
                            .cornerRadius(Theme.cornerRadius)
                        }
                    }
                    .padding(16)
                }
            }
        }
        .alert("New Shot", isPresented: $showAddShot) {
            TextField("Shot title", text: $newShotTitle)
            Button("Cancel", role: .cancel) { newShotTitle = "" }
            Button("Add") { addShot() }
        }
    }

    private func addShot() {
        guard !newShotTitle.isEmpty else { return }
        Task {
            do {
                let shot = try await APIService.shared.createShot(
                    projectId: projectId, title: newShotTitle, token: auth.sessionToken
                )
                shots.append(shot)
                newShotTitle = ""
            } catch {
                print("Failed to add shot: \(error)")
            }
        }
    }

    private func updateShotStatus(shot: Shot, status: String) {
        Task {
            do {
                try await APIService.shared.updateShot(
                    id: shot.id, fields: ["status": status], token: auth.sessionToken
                )
                if let index = shots.firstIndex(where: { $0.id == shot.id }) {
                    shots[index] = Shot(
                        id: shot.id, projectId: shot.projectId,
                        locationId: shot.locationId, sceneId: shot.sceneId,
                        title: shot.title, description: shot.description,
                        shotType: shot.shotType, imageUrl: shot.imageUrl,
                        status: status, position: shot.position
                    )
                }
            } catch {
                print("Failed to update shot: \(error)")
            }
        }
    }
}

struct ShotCard: View {
    let shot: Shot
    let onStatusChange: (String) -> Void

    private var statusColor: Color {
        switch shot.status {
        case "completed": return .green
        case "in_progress": return .orange
        case "cancelled": return .red
        default: return Theme.textMuted
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(shot.title)
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Spacer()
                Menu {
                    Button("Planned") { onStatusChange("planned") }
                    Button("In Progress") { onStatusChange("in_progress") }
                    Button("Completed") { onStatusChange("completed") }
                    Button("Cancelled") { onStatusChange("cancelled") }
                } label: {
                    Text(shot.status.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(8)
                }
            }

            if let desc = shot.description, !desc.isEmpty {
                Text(desc)
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(2)
            }

            if let shotType = shot.shotType, !shotType.isEmpty {
                Text(shotType)
                    .font(.caption)
                    .foregroundColor(Theme.textMuted)
            }
        }
        .padding(16)
        .background(Theme.bgCard)
        .cornerRadius(Theme.cornerRadius)
    }
}
