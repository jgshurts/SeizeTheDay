# Initial (startup) Database Schema

This will be the initial database schema. It is expected to evolve naturally as features are added to the application; this schema lays out a minimum viable product.

### Table: users

Authorized users of the application. 

Columns:

| colname    | type   | other                       |
|------------|--------|-----------------------------|
| id         | bigint | generated unique identifier |
| first_name | text   |                             |
| last_name  | text   |                             |
| nickname   | text   |                             |
| password   | text   |                             |


### Table: priority_groups

Columns:

| colname     | type    | other                       |
|-------------|---------|-----------------------------|
| id          | bigint  | generated unique identifier |
| prty        | int     |                             |
| prty_code   | char(1) |                             |
| description | text    |                             |


### Table: statuses

Columns:

| colname     | type    | other                       |
|-------------|---------|-----------------------------|
| id          | bigint  | generated unique identifier |
| status_code | char(1) |                             |
| is_complete | boolean | not null, default=false     |


### Table: projects

Columns:

| colname     | type   | other                       |
|-------------|--------|-----------------------------|
| id          | bigint | generated unique identifier |
| name        | text   |                             |
| description | text   |                             |


### Table: tasks

Columns:

| colname           | type     | other                                                                      |
|-------------------|----------|----------------------------------------------------------------------------|
| id                | bigint   | generated unique identifier                                                |
| project_id        | bigint   | nullable. fk to projects                                                   |
| owner_id          | bigint   | fk to users, represents owner of task. Set at creation time, then immutable. |
| assignee_id       | bigint   | fk to users, represents person assigned to complete task. Defaults to owner. |
| priority_group_id | bigint   | nullable. fk to priority_groups                                            |
| prty_ordinal      | int      | nullable.                                                                  |
| created_at        | datetime | set to current datetime when row inserted.                                 |
| date_planned      | date     | date when task is expected to be worked/commpleted                         |
| completed_at      | datetime |                                                                            |


### Table: notes

Columns:

| colname     | type        | other                                      |
|-------------|-------------|--------------------------------------------|
| id          | bigint      | generated unique identifier                |
| project_id  | bigint      | nullable. fk to projects                   |
| short_ref   | varchar(10) | Visual, meaningful ID for note             |
| note_text   | datetime b  | set to current datetime when row inserted. |
| created_at  | text        | contents of note, stored as markdown       |


