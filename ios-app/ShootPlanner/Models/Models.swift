import Foundation

struct Project: Codable, Identifiable {
    let id: UUID
    var name: String
    var description: String?
    let ownerId: String
    var coverImageUrl: String?
    var startDate: String?
    let createdAt: String
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case ownerId = "owner_id"
        case coverImageUrl = "cover_image_url"
        case startDate = "start_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct ShootDay: Codable, Identifiable {
    let id: UUID
    let projectId: UUID
    var dayNumber: Int
    var title: String?
    var date: String?
    let createdAt: String
    var locations: [Location]?

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case dayNumber = "day_number"
        case title, date
        case createdAt = "created_at"
        case locations
    }
}

struct Location: Codable, Identifiable {
    let id: UUID
    let shootDayId: UUID
    let projectId: UUID
    var name: String
    var description: String?
    var address: String?
    var latitude: Double?
    var longitude: Double?
    var photoUrl: String?
    var driveTimeFromPrevious: String?
    var driveDistanceFromPrevious: String?
    var position: Int
    var notes: String?
    var prepMinutes: Int?
    var shootMinutes: Int?
    var wrapMinutes: Int?
    var breakMinutes: Int?
    var completed: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case shootDayId = "shoot_day_id"
        case projectId = "project_id"
        case name, description, address, latitude, longitude
        case photoUrl = "photo_url"
        case driveTimeFromPrevious = "drive_time_from_previous"
        case driveDistanceFromPrevious = "drive_distance_from_previous"
        case position, notes
        case prepMinutes = "prep_minutes"
        case shootMinutes = "shoot_minutes"
        case wrapMinutes = "wrap_minutes"
        case breakMinutes = "break_minutes"
        case completed
    }
}

struct ShootScene: Codable, Identifiable {
    let id: UUID
    let locationId: UUID
    let projectId: UUID
    var title: String?
    var sceneText: String?
    var durationMinutes: Int?
    var position: Int

    enum CodingKeys: String, CodingKey {
        case id
        case locationId = "location_id"
        case projectId = "project_id"
        case title
        case sceneText = "scene_text"
        case durationMinutes = "duration_minutes"
        case position
    }
}

struct Shot: Codable, Identifiable {
    let id: UUID
    let projectId: UUID
    var locationId: UUID?
    var sceneId: UUID?
    var title: String
    var description: String?
    var shotType: String?
    var imageUrl: String?
    var status: String
    var position: Int

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case locationId = "location_id"
        case sceneId = "scene_id"
        case title, description
        case shotType = "shot_type"
        case imageUrl = "image_url"
        case status, position
    }
}

struct ProjectMember: Codable, Identifiable {
    let id: UUID
    let projectId: UUID
    let userId: String
    var email: String?
    var role: String
    let invitedAt: String
    var acceptedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case userId = "user_id"
        case email, role
        case invitedAt = "invited_at"
        case acceptedAt = "accepted_at"
    }
}
