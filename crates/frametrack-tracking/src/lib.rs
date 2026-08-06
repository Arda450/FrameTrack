// exportiert alles was andere crates verwenden können

mod error;
mod minute_aggregate;
mod state;
mod tracker;

pub use error::TrackingError;
pub use minute_aggregate::{
    minute_bucket_start, DominantMinute, MinuteAccumulator, MinuteActivityKey,
    AGGREGATION_INTERVAL_SECONDS, SAMPLE_INTERVAL_SECONDS,
};
pub use state::TrackingState;
pub use tracker::{
    current_timestamp, try_get_active_window_title, ActiveWindowClassifier, WindowAnalysis,
};
