//! Projekt Persistenz in SQLite.

use crate::DbError;
use rusqlite::{params, Connection, OptionalExtension};

/// Ein gespeichertes Projekt mit internem Pfad Schlüssel.
#[derive(Debug, Clone)]
pub struct DbProject {
    pub id: i64,
    pub name: String,
    pub path: String,
}

/// Schreibt ein Projekt oder aktualisiert den Namen bei gleichem Pfad.
pub fn upsert_project(
    conn: &Connection,
    name: &str,
    path: &str,
    now_ts: u64,
) -> Result<DbProject, DbError> {
    conn.execute(
        "INSERT INTO projects (name, path, created_at)
  VALUES (?1, ?2, ?3)
  ON CONFLICT(path) DO UPDATE SET name=excluded.name",
        params![name, path, now_ts as i64],
    )?;

    let mut stmt = conn.prepare("SELECT id, name, path FROM projects WHERE path = ?1")?;
    let p = stmt.query_row([path], |row| {
        Ok(DbProject {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
        })
    })?;

    Ok(p)
}

/// Legt ein neues Projekt nur mit Namen an (ohne Ordnerpfad aus dem Explorer).
/// Der interne `path` bleibt UNIQUE und wird synthetisch erzeugt.
/// `name` muss bereits getrimmt und nicht leer sein (Validierung im Command).
pub fn create_project(conn: &Connection, name: &str, now_ts: u64) -> Result<DbProject, DbError> {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    let path = format!("manual:{name}:{now_ts}:{nanos}");
    conn.execute(
        "INSERT INTO projects (name, path, created_at) VALUES (?1, ?2, ?3)",
        params![name, path, now_ts as i64],
    )?;

    let id = conn.last_insert_rowid();
    Ok(DbProject {
        id,
        name: name.to_string(),
        path,
    })
}

/// Listet alle Projekte alphabetisch nach Name.
pub fn list_projects(conn: &Connection) -> Result<Vec<DbProject>, DbError> {
    let mut stmt = conn.prepare("SELECT id, name, path FROM projects ORDER BY name ASC")?;
    let rows = stmt.query_map([], |row| {
        Ok(DbProject {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

/// Löscht alle Projekte aus der Datenbank.
pub fn delete_all_projects(conn: &Connection) -> Result<usize, DbError> {
    let count = conn.execute("DELETE FROM projects", [])?;
    Ok(count)
}

/// Benennt ein bestehendes Projekt um (nur Anzeigename; `path` bleibt unverändert).
/// Gibt `None` zurück, wenn keine Zeile mit `project_id` existiert.
pub fn rename_project(
    conn: &Connection,
    project_id: i64,
    name: &str,
) -> Result<Option<DbProject>, DbError> {
    let updated = conn.execute(
        "UPDATE projects SET name = ?1 WHERE id = ?2",
        params![name, project_id],
    )?;
    if updated == 0 {
        return Ok(None);
    }
    get_project_by_id(conn, project_id)
}

/// Löscht ein einzelnes Projekt samt zugehöriger Aktivitäten.
/// Aktivitäten werden zuerst entfernt, damit die Foreign-Key-Bedingung eingehalten wird.
/// Rückgabe ist die Anzahl gelöschter Projektzeilen (0 wenn nicht vorhanden).
pub fn delete_project(conn: &Connection, project_id: i64) -> Result<usize, DbError> {
    conn.execute(
        "DELETE FROM activities WHERE project_id = ?1",
        params![project_id],
    )?;
    let count = conn.execute("DELETE FROM projects WHERE id = ?1", params![project_id])?;
    Ok(count)
}

/// Gibt die Anzahl der Projekte zurück.
pub fn count_projects(conn: &Connection) -> Result<i64, DbError> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?;
    Ok(count)
}

/// Lädt ein Projekt anhand der ID oder None wenn nicht vorhanden.
pub fn get_project_by_id(conn: &Connection, project_id: i64) -> Result<Option<DbProject>, DbError> {
    let mut stmt = conn.prepare("SELECT id, name, path FROM projects WHERE id = ?1")?;
    let project = stmt
        .query_row([project_id], |row| {
            Ok(DbProject {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
            })
        })
        .optional()?;

    Ok(project)
}

/// Prüft, ob ein Projekt noch in der Datenbank existiert (z. B. vor Activity-Inserts).
pub fn project_exists(conn: &Connection, project_id: i64) -> Result<bool, DbError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}
