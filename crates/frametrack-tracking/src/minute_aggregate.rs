//! Minuten-Aggregation: 2-s-Samples im RAM, dominante Aktivität pro Minute.

use std::collections::HashMap;

use frametrack_core::ActivityType;

pub const SAMPLE_INTERVAL_SECONDS: u64 = 2;
pub const AGGREGATION_INTERVAL_SECONDS: u64 = 60;

/// Identität einer gesampelten Aktivität innerhalb einer Minuten-Bucket.
#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct MinuteActivityKey {
    pub project_id: i64,
    pub project_name: String,
    pub title: String,
    pub context_key: String,
    pub activity_type: ActivityType,
}

/// Ergebnis einer abgeschlossenen Minuten-Bucket vor der Persistenz.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DominantMinute {
    pub key: MinuteActivityKey,
    pub timestamp: u64,
    pub duration_seconds: u64,
}

#[derive(Debug)]
pub struct MinuteAccumulator {
    bucket_start: u64,
    first_sample_ts: Option<u64>,
    total_samples: u64,
    sequence: u64,
    counts: HashMap<MinuteActivityKey, (u64, u64)>,
}

impl MinuteAccumulator {
    pub fn new(timestamp: u64) -> Self {
        Self {
            bucket_start: minute_bucket_start(timestamp),
            first_sample_ts: None,
            total_samples: 0,
            sequence: 0,
            counts: HashMap::new(),
        }
    }

    pub fn bucket_start(&self) -> u64 {
        self.bucket_start
    }

    pub fn record(&mut self, key: MinuteActivityKey, timestamp: u64) {
        self.first_sample_ts.get_or_insert(timestamp);
        self.total_samples = self.total_samples.saturating_add(1);
        self.sequence = self.sequence.saturating_add(1);
        let entry = self.counts.entry(key).or_insert((0, 0));
        entry.0 = entry.0.saturating_add(1);
        entry.1 = self.sequence;
    }

    pub fn reset(&mut self, timestamp: u64) {
        self.bucket_start = minute_bucket_start(timestamp);
        self.first_sample_ts = None;
        self.total_samples = 0;
        self.sequence = 0;
        self.counts.clear();
    }

    /// Liefert die dominante Aktivität der aktuellen Minute, falls Samples vorhanden sind.
    pub fn dominant_minute(&self) -> Option<DominantMinute> {
        let (dominant, _) = self
            .counts
            .iter()
            .max_by(|(_, left), (_, right)| left.0.cmp(&right.0).then(left.1.cmp(&right.1)))?;

        let duration_seconds = self
            .total_samples
            .saturating_mul(SAMPLE_INTERVAL_SECONDS)
            .min(AGGREGATION_INTERVAL_SECONDS);
        if duration_seconds == 0 {
            return None;
        }

        Some(DominantMinute {
            key: dominant.clone(),
            timestamp: self.first_sample_ts.unwrap_or(self.bucket_start),
            duration_seconds,
        })
    }
}

pub fn minute_bucket_start(timestamp: u64) -> u64 {
    (timestamp / AGGREGATION_INTERVAL_SECONDS) * AGGREGATION_INTERVAL_SECONDS
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_key(title: &str) -> MinuteActivityKey {
        MinuteActivityKey {
            project_id: 1,
            project_name: "Test".to_string(),
            title: title.to_string(),
            context_key: "VS Code".to_string(),
            activity_type: ActivityType::Development,
        }
    }

    #[test]
    fn empty_bucket_has_no_dominant_activity() {
        let accumulator = MinuteAccumulator::new(1_700_000_000);
        assert!(accumulator.dominant_minute().is_none());
    }

    #[test]
    fn thirty_samples_yield_sixty_second_duration() {
        let mut accumulator = MinuteAccumulator::new(1_700_000_000);
        let key = sample_key("lib.rs - frametrack");

        for offset in 0..30 {
            accumulator.record(key.clone(), 1_700_000_000 + offset * 2);
        }

        let dominant = accumulator.dominant_minute().expect("dominant minute");
        assert_eq!(dominant.duration_seconds, 60);
        assert_eq!(dominant.key.title, "lib.rs - frametrack");
        assert_eq!(dominant.timestamp, 1_700_000_000);
    }

    #[test]
    fn most_frequent_title_wins_within_a_minute() {
        let mut accumulator = MinuteAccumulator::new(1_700_000_000);
        let ide = sample_key("lib.rs - frametrack");
        let browser = sample_key("Docs - Mozilla Firefox");

        for _ in 0..20 {
            accumulator.record(ide.clone(), 1_700_000_010);
        }
        for _ in 0..10 {
            accumulator.record(browser.clone(), 1_700_000_012);
        }

        let dominant = accumulator.dominant_minute().expect("dominant minute");
        assert_eq!(dominant.key.title, "lib.rs - frametrack");
        assert_eq!(dominant.duration_seconds, 60);
    }

    #[test]
    fn tie_breaker_prefers_most_recent_sample() {
        let mut accumulator = MinuteAccumulator::new(1_700_000_000);
        let first = sample_key("First window");
        let second = sample_key("Second window");

        accumulator.record(first.clone(), 1_700_000_002);
        accumulator.record(second.clone(), 1_700_000_004);

        let dominant = accumulator.dominant_minute().expect("dominant minute");
        assert_eq!(dominant.key.title, "Second window");
    }

    #[test]
    fn reset_clears_previous_bucket() {
        let mut accumulator = MinuteAccumulator::new(1_700_000_000);
        accumulator.record(sample_key("old"), 1_700_000_000);
        accumulator.reset(1_700_000_100);

        assert_eq!(accumulator.bucket_start(), 1_700_000_100);
        assert!(accumulator.dominant_minute().is_none());
    }
}
