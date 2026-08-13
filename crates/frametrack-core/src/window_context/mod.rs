//! Normalisiert Windows Fenstertitel zu Labels und Tätigkeitsklassen.

mod activity_type;
mod browser;
mod classification;
mod labels;
mod title_parse;

pub use activity_type::ActivityType;
pub use browser::is_supported_browser_title;
pub use classification::{classify_activity_type, classify_activity_type_with_url};
pub use labels::{
    category_key_from_title, category_key_from_title_with_url, format_app_label_from_title,
    format_context_label_from_title,
};
