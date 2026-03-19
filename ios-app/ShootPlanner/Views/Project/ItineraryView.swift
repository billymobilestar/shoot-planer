import SwiftUI

struct ItineraryView: View {
    @EnvironmentObject var auth: AuthService
    @Binding var days: [ShootDay]
    let projectId: UUID
    @State private var showAddDay = false
    @State private var showAddLocation = false
    @State private var selectedDayId: UUID?

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            if days.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 48))
                        .foregroundColor(Theme.textMuted)
                    Text("No shoot days yet")
                        .foregroundColor(Theme.textSecondary)
                    Button("Add Day") { addDay() }
                        .buttonStyle(AccentButtonStyle())
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(days) { day in
                            DayCard(
                                day: day,
                                onAddLocation: {
                                    selectedDayId = day.id
                                    showAddLocation = true
                                },
                                onToggleComplete: { location in
                                    toggleComplete(location: location)
                                }
                            )
                        }

                        Button(action: addDay) {
                            HStack {
                                Image(systemName: "plus")
                                Text("Add Day")
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
        .alert("Add Location", isPresented: $showAddLocation) {
            AddLocationAlert(dayId: selectedDayId, projectId: projectId) { newLocation in
                if let dayIndex = days.firstIndex(where: { $0.id == selectedDayId }) {
                    if days[dayIndex].locations == nil {
                        days[dayIndex].locations = []
                    }
                    days[dayIndex].locations?.append(newLocation)
                }
            }
        }
    }

    private func addDay() {
        let nextNumber = (days.map(\.dayNumber).max() ?? 0) + 1
        Task {
            do {
                let day = try await APIService.shared.createDay(
                    projectId: projectId,
                    dayNumber: nextNumber,
                    title: "Day \(nextNumber)",
                    token: auth.sessionToken
                )
                days.append(day)
            } catch {
                print("Failed to add day: \(error)")
            }
        }
    }

    private func toggleComplete(location: Location) {
        Task {
            do {
                try await APIService.shared.updateLocation(
                    id: location.id,
                    fields: ["completed": !location.completed],
                    token: auth.sessionToken
                )
                // Update local state
                for dayIndex in days.indices {
                    if let locIndex = days[dayIndex].locations?.firstIndex(where: { $0.id == location.id }) {
                        days[dayIndex].locations?[locIndex].completed.toggle()
                    }
                }
            } catch {
                print("Failed to toggle complete: \(error)")
            }
        }
    }
}

struct DayCard: View {
    let day: ShootDay
    let onAddLocation: () -> Void
    let onToggleComplete: (Location) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Day header
            HStack {
                Text(day.title ?? "Day \(day.dayNumber)")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Spacer()
                if let date = day.date {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(Theme.textMuted)
                }
            }

            // Locations
            if let locations = day.locations, !locations.isEmpty {
                ForEach(locations) { location in
                    LocationRow(location: location, onToggleComplete: { onToggleComplete(location) })
                }
            }

            // Add location button
            Button(action: onAddLocation) {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle")
                    Text("Add location")
                }
                .font(.subheadline)
                .foregroundColor(Theme.accent)
            }
        }
        .padding(16)
        .background(Theme.bgCard)
        .cornerRadius(Theme.cornerRadius)
    }
}

struct LocationRow: View {
    let location: Location
    let onToggleComplete: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggleComplete) {
                Image(systemName: location.completed ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(location.completed ? .green : Theme.textMuted)
                    .font(.title3)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(location.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.textPrimary)
                    .strikethrough(location.completed, color: Theme.textMuted)
                if let address = location.address, !address.isEmpty {
                    Text(address)
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let driveTime = location.driveTimeFromPrevious, !driveTime.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "car")
                        .font(.caption2)
                    Text(driveTime)
                        .font(.caption2)
                }
                .foregroundColor(Theme.textMuted)
            }
        }
        .padding(.vertical, 4)
    }
}

struct AddLocationAlert: View {
    let dayId: UUID?
    let projectId: UUID
    let onAdd: (Location) -> Void
    @State private var name = ""
    @EnvironmentObject var auth: AuthService

    var body: some View {
        TextField("Location name", text: $name)
        Button("Cancel", role: .cancel) {}
        Button("Add") {
            guard let dayId = dayId, !name.isEmpty else { return }
            Task {
                if let locations = try? await APIService.shared.createLocation(
                    shootDayId: dayId, projectId: projectId, name: name, position: 0, token: auth.sessionToken
                ) {
                    onAdd(locations)
                }
            }
        }
    }
}

struct AccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(Theme.accent)
            .cornerRadius(Theme.cornerRadius)
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}
