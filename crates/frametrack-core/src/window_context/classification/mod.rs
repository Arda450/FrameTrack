//! Strukturbasierte Klassifikation von Fenstertiteln in Tätigkeitsklassen.

mod logic;
mod signals;

#[cfg(test)]
mod tests;

pub use logic::{classify_activity_type, classify_activity_type_with_url};
