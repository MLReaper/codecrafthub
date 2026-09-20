// app.js

const express = require("express");
const fs = require("fs/promises");
const path = require("path");

// Create the Express application
const app = express();

// The server will run on port 5000
const PORT = 5000;

// Store courses.json in the data folder
const DATA_FILE = path.join(__dirname, "..", "data", "courses.json");

// Valid course status values
const VALID_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed"
];

// Middleware that allows Express to read JSON request bodies
app.use(express.json());

// Serve the dashboard from the public folder
app.use(express.static(path.join(__dirname, "..", "public")));

/*
  Custom error class.

  This lets us attach an HTTP status code to errors.
*/
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

/*
  Read courses from courses.json.

  If the file does not exist, create it with an empty array.
*/
async function readCourses() {
  try {
    const fileContents = await fs.readFile(DATA_FILE, "utf8");

    // An empty file is treated as an empty course list
    if (!fileContents.trim()) {
      return [];
    }

    const courses = JSON.parse(fileContents);

    // Make sure the JSON file contains an array
    if (!Array.isArray(courses)) {
      throw new AppError(
        "courses.json must contain a JSON array.",
        500
      );
    }

    return courses;
  } catch (error) {
    // If the file does not exist, create it automatically
    if (error.code === "ENOENT") {
      try {
        await fs.writeFile(DATA_FILE, "[]", "utf8");
        return [];
      } catch (writeError) {
        throw new AppError(
          `Unable to create courses.json: ${writeError.message}`,
          500
        );
      }
    }

    // Re-throw our own application errors
    if (error instanceof AppError) {
      throw error;
    }

    // Handle invalid JSON
    if (error instanceof SyntaxError) {
      throw new AppError(
        "Unable to read courses.json because it contains invalid JSON.",
        500
      );
    }

    // Handle other file read errors
    throw new AppError(
      `Unable to read courses.json: ${error.message}`,
      500
    );
  }
}

/*
  Write the complete course array to courses.json.
*/
async function writeCourses(courses) {
  try {
    const jsonData = JSON.stringify(courses, null, 2);

    await fs.writeFile(DATA_FILE, jsonData, "utf8");
  } catch (error) {
    throw new AppError(
      `Unable to write to courses.json: ${error.message}`,
      500
    );
  }
}

/*
  Check whether a date uses the exact YYYY-MM-DD format
  and represents a real calendar date.
*/
function isValidDateFormat(dateString) {
  if (typeof dateString !== "string") {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/*
  Validate all required fields when creating a course.
*/
function validateCourseData(courseData) {
  if (!courseData || typeof courseData !== "object") {
    throw new AppError(
      "Request body must contain a JSON object.",
      400
    );
  }

  const requiredFields = [
    "name",
    "description",
    "target_date",
    "status"
  ];

  // Check that every required field exists and is not empty
  for (const field of requiredFields) {
    if (
      courseData[field] === undefined ||
      courseData[field] === null ||
      String(courseData[field]).trim() === ""
    ) {
      throw new AppError(
        `Missing required field: ${field}`,
        400
      );
    }
  }

  // Check that status is valid
  if (!VALID_STATUSES.includes(courseData.status)) {
    throw new AppError(
      `Invalid status. Status must be one of: ${VALID_STATUSES.join(
        ", "
      )}`,
      400
    );
  }

  // Check the target date
  if (!isValidDateFormat(courseData.target_date)) {
    throw new AppError(
      "target_date must use the format YYYY-MM-DD and be a valid date.",
      400
    );
  }
}

/*
  Generate the next numeric ID.
*/
function getNextCourseId(courses) {
  if (courses.length === 0) {
    return 1;
  }

  const highestId = courses.reduce((highest, course) => {
    const numericId = Number(course.id);

    if (Number.isNaN(numericId)) {
      return highest;
    }

    return Math.max(highest, numericId);
  }, 0);

  return highestId + 1;
}

/*
  Helper for asynchronous route handlers.
*/
function asyncHandler(handler) {
  return function (request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

/*
  POST /api/courses

  Add a new course.
*/
app.post(
  "/api/courses",
  asyncHandler(async (req, res) => {
    // Validate the request body
    validateCourseData(req.body);

    const courses = await readCourses();

    const newCourse = {
      id: getNextCourseId(courses),
      name: String(req.body.name).trim(),
      description: String(req.body.description).trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: new Date().toISOString()
    };

    courses.push(newCourse);

    await writeCourses(courses);

    res.status(201).json({
      message: "Course created successfully.",
      course: newCourse
    });
  })
);

/*
  GET /api/courses

  Get all courses.
*/
app.get(
  "/api/courses",
  asyncHandler(async (req, res) => {
    const courses = await readCourses();

    res.status(200).json(courses);
  })
);

/*
  GET /api/courses/stats

  Get statistics about courses.
*/
app.get(
  "/api/courses/stats",
  asyncHandler(async (req, res) => {
    const courses = await readCourses();

    const stats = {
      total: courses.length,
      "Not Started": 0,
      "In Progress": 0,
      "Completed": 0
    };

    for (const course of courses) {
      if (VALID_STATUSES.includes(course.status)) {
        stats[course.status]++;
      }
    }

    res.status(200).json(stats);
  })
);

/*
  GET /api/courses/:id

  Get one specific course.
*/
app.get(
  "/api/courses/:id",
  asyncHandler(async (req, res) => {
    const courses = await readCourses();

    const course = courses.find(
      (item) => String(item.id) === String(req.params.id)
    );

    if (!course) {
      throw new AppError("Course not found.", 404);
    }

    res.status(200).json(course);
  })
);

/*
  PUT /api/courses/:id

  Update one or more fields of an existing course.

  Example:
  {
    "status": "In Progress"
  }
*/
app.put(
  "/api/courses/:id",
  asyncHandler(async (req, res) => {
    const courses = await readCourses();

    const courseIndex = courses.findIndex(
      (item) => String(item.id) === String(req.params.id)
    );

    if (courseIndex === -1) {
      throw new AppError("Course not found.", 404);
    }

    const existingCourse = courses[courseIndex];

    // Update name if provided
    if (req.body.name !== undefined) {
      if (String(req.body.name).trim() === "") {
        throw new AppError("name cannot be empty.", 400);
      }

      existingCourse.name = String(req.body.name).trim();
    }

    // Update description if provided
    if (req.body.description !== undefined) {
      if (String(req.body.description).trim() === "") {
        throw new AppError("description cannot be empty.", 400);
      }

      existingCourse.description =
        String(req.body.description).trim();
    }

    // Update target_date if provided
    if (req.body.target_date !== undefined) {
      if (!isValidDateFormat(req.body.target_date)) {
        throw new AppError(
          "target_date must use the format YYYY-MM-DD and be a valid date.",
          400
        );
      }

      existingCourse.target_date = req.body.target_date;
    }

    // Update status if provided
    if (req.body.status !== undefined) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        throw new AppError(
          `Invalid status. Status must be one of: ${VALID_STATUSES.join(
            ", "
          )}`,
          400
        );
      }

      existingCourse.status = req.body.status;
    }

    await writeCourses(courses);

    res.status(200).json({
      message: "Course updated successfully.",
      course: existingCourse
    });
  })
);

/*
  DELETE /api/courses/:id

  Delete one course.
*/
app.delete(
  "/api/courses/:id",
  asyncHandler(async (req, res) => {
    const courses = await readCourses();

    const courseIndex = courses.findIndex(
      (item) => String(item.id) === String(req.params.id)
    );

    if (courseIndex === -1) {
      throw new AppError("Course not found.", 404);
    }

    const deletedCourse = courses.splice(courseIndex, 1)[0];

    await writeCourses(courses);

    res.status(200).json({
      message: "Course deleted successfully.",
      course: deletedCourse
    });
  })
);

/*
  Handle routes that do not exist.
*/
app.use((req, res, next) => {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404
    )
  );
});

/*
  Handle invalid JSON.
*/
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: "Request body contains invalid JSON."
    });
  }

  next(error);
});

/*
  General error handler.
*/
app.use((error, req, res, next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "An internal server error occurred."
        : error.message
  });
});

/*
  Start the server.
*/
async function startServer() {
  try {
    await readCourses();

    console.log("CodeCraftHub API is starting...");
    console.log(`Data will be stored in: ${DATA_FILE}`);

    app.listen(PORT, () => {
      console.log(
        `API is available at: http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Unable to start the server:",
      error.message
    );

    process.exit(1);
  }
}

// Start the server
startServer();