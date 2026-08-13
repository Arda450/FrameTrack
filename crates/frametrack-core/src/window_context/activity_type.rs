//! Tätigkeitsklassen für Aggregation, Persistenz und UI.

use serde::Serialize;

/// Tätigkeitsklassen für die Übersichts-Aggregation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
pub enum ActivityType {
    Development,
    Communication,
    Research,
    Organization,
    Entertainment,
    Shopping,
    System,
    Other,
}

impl ActivityType {
    /// Deutscher Anzeigename für UI und Export.
    pub fn label(&self) -> &'static str {
        match self {
            Self::Development => "Entwicklung",
            Self::Communication => "Kommunikation",
            Self::Research => "Recherche",
            Self::Organization => "Organisation",
            Self::Entertainment => "Unterhaltung",
            Self::Shopping => "Einkaufen",
            Self::System => "System",
            Self::Other => "Sonstiges",
        }
    }

    /// Stabiler, sprachunabhängiger Wert für die lokale Persistenz.
    pub fn key(&self) -> &'static str {
        match self {
            Self::Development => "development",
            Self::Communication => "communication",
            Self::Research => "research",
            Self::Organization => "organization",
            Self::Entertainment => "entertainment",
            Self::Shopping => "shopping",
            Self::System => "system",
            Self::Other => "other",
        }
    }

    /// Liest einen zuvor persistierten Schlüssel.
    pub fn from_key(key: &str) -> Option<Self> {
        match key {
            "development" => Some(Self::Development),
            "communication" => Some(Self::Communication),
            "research" => Some(Self::Research),
            "organization" => Some(Self::Organization),
            "entertainment" => Some(Self::Entertainment),
            "shopping" => Some(Self::Shopping),
            "system" => Some(Self::System),
            "other" => Some(Self::Other),
            _ => None,
        }
    }

    /// Alle Varianten in fester Reihenfolge für konsistente Charts.
    pub fn all() -> &'static [ActivityType] {
        &[
            Self::Development,
            Self::Communication,
            Self::Research,
            Self::Organization,
            Self::Entertainment,
            Self::Shopping,
            Self::System,
            Self::Other,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::ActivityType;

    /// Prüft Roundtrip zwischen Schlüssel und Variante.
    #[test]
    fn activity_type_keys_round_trip() {
        for activity_type in ActivityType::all() {
            assert_eq!(
                ActivityType::from_key(activity_type.key()),
                Some(*activity_type)
            );
        }
    }
}
