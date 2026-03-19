import Foundation

actor APIService {
    static let shared = APIService()

    private let baseURL = Config.supabaseURL
    private let anonKey = Config.supabaseAnonKey
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    private func makeRequest(_ path: String, method: String = "GET", body: [String: Any]? = nil, token: String?) -> URLRequest {
        var request = URLRequest(url: URL(string: "\(baseURL)/rest/v1/\(path)")!)
        request.httpMethod = method
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        return request
    }

    // MARK: - Projects

    func fetchProjects(token: String?) async throws -> [Project] {
        let request = makeRequest("projects?select=*&order=created_at.desc", token: token)
        let (data, _) = try await URLSession.shared.data(for: request)
        return try decoder.decode([Project].self, from: data)
    }

    func createProject(name: String, ownerId: String, token: String?) async throws -> Project {
        let body: [String: Any] = ["name": name, "owner_id": ownerId]
        var request = makeRequest("projects", method: "POST", body: body, token: token)
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        let (data, _) = try await URLSession.shared.data(for: request)
        let projects = try decoder.decode([Project].self, from: data)
        guard let project = projects.first else { throw APIError.noData }
        return project
    }

    func deleteProject(id: UUID, token: String?) async throws {
        let request = makeRequest("projects?id=eq.\(id.uuidString)", method: "DELETE", token: token)
        let _ = try await URLSession.shared.data(for: request)
    }

    func updateProject(id: UUID, fields: [String: Any], token: String?) async throws -> Project {
        var request = makeRequest("projects?id=eq.\(id.uuidString)", method: "PATCH", body: fields, token: token)
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        let (data, _) = try await URLSession.shared.data(for: request)
        let projects = try decoder.decode([Project].self, from: data)
        guard let project = projects.first else { throw APIError.noData }
        return project
    }

    // MARK: - Shoot Days

    func fetchDays(projectId: UUID, token: String?) async throws -> [ShootDay] {
        let request = makeRequest(
            "shoot_days?project_id=eq.\(projectId.uuidString)&select=*,locations:locations(*)&order=day_number.asc&locations.order=position.asc",
            token: token
        )
        let (data, _) = try await URLSession.shared.data(for: request)
        return try decoder.decode([ShootDay].self, from: data)
    }

    func createDay(projectId: UUID, dayNumber: Int, title: String?, token: String?) async throws -> ShootDay {
        var body: [String: Any] = [
            "project_id": projectId.uuidString,
            "day_number": dayNumber
        ]
        if let title = title { body["title"] = title }
        var request = makeRequest("shoot_days", method: "POST", body: body, token: token)
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        let (data, _) = try await URLSession.shared.data(for: request)
        let days = try decoder.decode([ShootDay].self, from: data)
        guard let day = days.first else { throw APIError.noData }
        return day
    }

    func deleteDay(id: UUID, token: String?) async throws {
        let request = makeRequest("shoot_days?id=eq.\(id.uuidString)", method: "DELETE", token: token)
        let _ = try await URLSession.shared.data(for: request)
    }

    // MARK: - Locations

    func createLocation(shootDayId: UUID, projectId: UUID, name: String, position: Int, token: String?) async throws -> Location {
        let body: [String: Any] = [
            "shoot_day_id": shootDayId.uuidString,
            "project_id": projectId.uuidString,
            "name": name,
            "position": position,
            "completed": false
        ]
        var request = makeRequest("locations", method: "POST", body: body, token: token)
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        let (data, _) = try await URLSession.shared.data(for: request)
        let locations = try decoder.decode([Location].self, from: data)
        guard let location = locations.first else { throw APIError.noData }
        return location
    }

    func updateLocation(id: UUID, fields: [String: Any], token: String?) async throws {
        let request = makeRequest("locations?id=eq.\(id.uuidString)", method: "PATCH", body: fields, token: token)
        let _ = try await URLSession.shared.data(for: request)
    }

    func deleteLocation(id: UUID, token: String?) async throws {
        let request = makeRequest("locations?id=eq.\(id.uuidString)", method: "DELETE", token: token)
        let _ = try await URLSession.shared.data(for: request)
    }

    // MARK: - Shots

    func fetchShots(projectId: UUID, token: String?) async throws -> [Shot] {
        let request = makeRequest(
            "shots?project_id=eq.\(projectId.uuidString)&select=*&order=position.asc",
            token: token
        )
        let (data, _) = try await URLSession.shared.data(for: request)
        return try decoder.decode([Shot].self, from: data)
    }

    func createShot(projectId: UUID, title: String, token: String?) async throws -> Shot {
        let body: [String: Any] = [
            "project_id": projectId.uuidString,
            "title": title,
            "status": "planned",
            "position": 0
        ]
        var request = makeRequest("shots", method: "POST", body: body, token: token)
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        let (data, _) = try await URLSession.shared.data(for: request)
        let shots = try decoder.decode([Shot].self, from: data)
        guard let shot = shots.first else { throw APIError.noData }
        return shot
    }

    func updateShot(id: UUID, fields: [String: Any], token: String?) async throws {
        let request = makeRequest("shots?id=eq.\(id.uuidString)", method: "PATCH", body: fields, token: token)
        let _ = try await URLSession.shared.data(for: request)
    }

    func deleteShot(id: UUID, token: String?) async throws {
        let request = makeRequest("shots?id=eq.\(id.uuidString)", method: "DELETE", token: token)
        let _ = try await URLSession.shared.data(for: request)
    }
}

enum APIError: LocalizedError {
    case noData
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .noData: return "No data returned."
        case .serverError(let code): return "Server error (\(code))."
        }
    }
}
