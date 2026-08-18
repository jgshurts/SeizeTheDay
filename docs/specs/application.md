# High level application overview:

This application will be called "Sieze the Day", and it will serve as a personal, daily to-do manager and information organization tool.

## Technology
The tech stack for this application is in docs/specs/tech-fundamentals.md.

## Database Schema
The initial schema requirements for this application are described in docs/specs/db-schema.md. Using this schema, we will build a Prisma schema file, and then an initial Prisma migration which will be used to instantiate the basic initial schema.

## User Interface

### Login
The app will present a login page when first opened by a user. Passwords will be stored in the Users table, and will
be hashed before storing to maintain privacy. Once a user logs in, the session should remain open as long as the app 
window is open (no default timeout).

### Main Page

This will be primarily a one-page application, with dialogs used sparingly where needed. The main page will have a simple banner above the app content, and on the right side, a badge showing who is currently logged in will be shown. The banner will also have a Date field, defaulting to today's date, with a date picker to allow the date to be changed (and left/right buttons for convenience to move a day at a time in either chronological direction).

In the main body of the application page, there will be two main columns, with the first at roughly 35% of the width of the page and the second at 65%. 

#### Tasks

The left column will be labeled 'Tasks'. It will contain a grid, which is scrollable vertically, with the following columns, all of which map to attributes of the Task model.

* Sta: Task.status.statusCode
* PG: Task.PriorityGroup.prtyCode
* PR: Task.prtyOrdinal
* Description: Task.description

An invisible column will store the PriorityGroup.prty value for each task; when sorting (see below), sorting will be done
on the prty value, not the prtyCode.

Above the grid there will be a '+' button that will allow a new task to be added. 
On each existing task row, a trash icon will be displayed, which will allow the user to delete a task.
Only tasks with a datePlanned that matches the active date in the page banner will be displayed.
By default, tasks will be sorted in the following order:
* Task.status.statusCode
* Task.priorityGroup.prty
* Task.prty

A toggle above the grid will allow a user to show or hide completed tasks. Completed tasks will be shown by default; clicking on the toggle will hide them (and clicking again will show them, etc.).

#### Notes

The right column will be labeled 'Notes'. It will contain a list of notes (text, with other attributes as well). In each member of the list, the following information will be displayed:

* Note.Project.name
* Note.created_at
* Note.shortRef
* Note.noteText

Project will be selectable (a dropdown).
Created_at aill be auto-filled when a note is saved, and will then be immutable.
ShortRef will be an editable field (max 10 chars).
NoteText will be  a rich text field, and will accept Markdown. The text will be shown in read-only, rendered form by default. When a user clicks on the text area, the field will become editable, and will be in plain text, showing all markdown characters/syntax used in the note. Tabbing away from the note will exit edit mode and auto-save the text. (Same goes for all editable fields on a Note - we will auto-save as the user exits the field or selects an item from a dropdown.)


