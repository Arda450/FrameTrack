use crate::ActivityType;
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct WindowActivity {
    pub title: String,
    pub timestamp: u64, // unix timestamp in seconds
    /// Bereits beim Sampling abgeleitet; enthält niemals die Browser-URL.
    pub activity_type: ActivityType,
}
