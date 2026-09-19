# CodeCraftHub

Personal learning goal tracker API built with Node.js and Express.

CodeCraftHub allows developers to create, view, update, and delete courses they want to learn. Course data is stored in a local `courses.json` file, so no database is required.

## Features

- REST API built with Express
- Create new courses
- View all courses
- View a specific course
- Update existing courses
- Delete courses
- Automatically generated numeric course IDs
- Automatically generated creation timestamps
- Course status validation
- Target date validation using the `YYYY-MM-DD` format
- Automatic creation of `courses.json`
- Error handling for:
  - Missing required fields
  - Invalid status values
  - Invalid dates
  - Courses that do not exist
  - File read and write errors

## Project Structure

```text
codecrafthub/
├── data/
│   └── courses.json
├── src/
│   ├── app.js
│   ├── routes/
│   │   └── courseRoutes.js
│   ├── controllers/
│   │   └── courseController.js
│   └── services/
│       └── courseService.js
├── package.json
└── README.md
