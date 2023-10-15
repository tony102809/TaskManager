// app.mjs
import express from 'express';
import {resolve, dirname} from 'path';
import {readFile, readdir} from 'fs';
import {fileURLToPath} from 'url';
import * as path from 'path';
import {Task} from './task.mjs';
import { urlencoded } from 'express';
import fs from 'fs';



const app = express();
// set hbs engine
app.set('view engine', 'hbs');


// TODO: use middleware to serve static files from public
// make sure to calculate the absolute path to the directory
// with import.meta.url

// TODO: use middleware required for reading body
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(__dirname, 'public');
app.use(express.static(publicDirectory));

//PART 3: Middleware and Logging
app.use(urlencoded({ extended: false }));

app.use((req, res, next) => {
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next(); 
});

// The global list to store all tasks to be rendered
let taskList = [];

// The reading path
const readingPath = path.resolve(__dirname, './saved-tasks');

/**
 * This function sort tasks by the give criteria "sort-by" and "sort-order"
 * @param {Request} req query should contain "sort-by" and "sort-order"
 * @param {[Task]} l the array of tasks to be sorted
 * @return {[Task]} sorted array of tasks by the given criteria
 */
function sortTasks(req, l) {
  if (req.query['sort-by'] && req.query['sort-order']) {
    const newL = [...l];
    const crit = req.query['sort-by'];
    const ord = req.query['sort-order'];
    newL.sort((a, b)=>{
      if (ord === 'asc') {
        switch (crit) {
          case 'due-date': {
            const a1 = new Date(a[crit]);
            const b1 = new Date(b[crit]);
            if (a1 === b1) { return 0; }
            return a1 > b1 ? 1 : -1;
          }
          case 'priority': {
            return a[crit] - b[crit];
          }
          default: {
            return 0;
          }
        }
      } else if (ord === 'desc') {
        switch (crit) {
          case 'due-date': {
            const a1 = new Date(a[crit]);
            const b1 = new Date(b[crit]);
            if (a1 === b1) { return 0; }
            return a1 < b1 ? 1 : -1;
          }
          case 'priority': {
            return b[crit] - a[crit];
          }
          default: {
            return 0;
          }
        }
      } else {
        return [];
      }
    });
    return newL;
  } else {
    return l;
  }
}

/**
 * This function sort tasks by whether they are pinned or not
 * @param {[Task]} l the array of tasks to be sorted
 * @return {[Task]} sorted array of tasks, with pinned tasks first
 */
function pinnedTasks(l) {
  return [...l].sort((a, b)=>b.pinned-a.pinned);
}

function loadTasks(callback) {
  readFromFS(readingPath, (tasks) => {
    taskList = tasks;
    callback(taskList);
  });
}

function readFromFS(saved_task_path, onReadingDone) {
  const tasks = [];

  readdir(saved_task_path, (err, files) => {
    let count = 0;
    const nFiles = files.length;

    for (const fileName of files) {
      const filePath = resolve(saved_task_path, fileName);

      readFile(filePath, 'utf8', (err, data) => {
        ++count;

        if (err) {
          throw err;
        }

        const fileInJson = JSON.parse(data.toString());
        const task = new Task(fileInJson);
        tasks.push(task);

        if (count === nFiles) {
          onReadingDone(tasks);
        }
      });
    }
  });
}


/**
 * app.get() functions below
 */

app.get('/', (req, res) => {

    let pinnedTasks = [];
    let unpinnedTasks = [];

    // Split tasks into pinned and unpinned
    for (let i = 0; i < taskList.length; i++) {
      if (taskList[i].pinned) {
        pinnedTasks.push(taskList[i]);
      } else {
        unpinnedTasks.push(taskList[i]);
      }
    }


    const sortBy = req.query['sort-by'];
    const sortOrder = req.query['sort-order'];

    // Check if sorting parameters are provided
    if (sortBy === 'due-date' || sortBy === 'priority') {
      pinnedTasks = sortTasks(req, pinnedTasks); 
      unpinnedTasks = sortTasks(req, unpinnedTasks);    
    }

    const sortedTasks = pinnedTasks.concat(unpinnedTasks);

    res.render('index', { tasks: sortedTasks });
  
});


app.get('/filter', (req, res) => {
  
  const titleQ = req.query['titleQ'];
  const tagQ = req.query['tagQ'];

  let filteredTasks = [...taskList]; 

  if (titleQ) {
    filteredTasks = filteredTasks.filter(task => task.title.toLowerCase().includes(titleQ.toLowerCase()));
  }

  if (tagQ) {
    filteredTasks = filteredTasks.filter(task => task.hasTag(tagQ));
  }

  res.render('index', { tasks: filteredTasks });
});



app.get('/add', (req, res) => {
  res.render('addTask'); // Render the form for adding a new task
});

app.post('/add', (req, res) => {

  const {
    title,
    description,
    priority,
    'due-date': dueDate,
    pinned,
    tags,
    progress
  } = req.body;

  // Create a new task object
  const newTaskData = {
    title,
    description,
    priority: parseInt(priority),
    'due-date': new Date(dueDate), // Convert the date string to a Date object
    pinned: pinned === 'true',
    tags: tags.split(',').map(tag => tag.trim()), 
    progress
  };

  // Create a new Task object
  const newTask = new Task(newTaskData);

  // Add the new task to the in-memory task list
  taskList.push(newTask);

  //Same sorting algorithm as above ^^
  let pinnedTasks = [];
  let unpinnedTasks = [];

  // Split tasks into pinned and unpinned
  for (let i = 0; i < taskList.length; i++) {
    if (taskList[i].pinned) {
      pinnedTasks.push(taskList[i]);
    } else {
      unpinnedTasks.push(taskList[i]);
    }
  }


  const sortBy = req.query['sort-by'];
  const sortOrder = req.query['sort-order'];

  // Check if sorting parameters are provided
  if (sortBy === 'due-date' || sortBy === 'priority') {
    pinnedTasks = sortTasks(req, pinnedTasks); 
    unpinnedTasks = sortTasks(req, unpinnedTasks);    
  }

  const sortedTasks = pinnedTasks.concat(unpinnedTasks);

  res.render('index', { tasks: sortedTasks });

});


loadTasks((loadedTasks) => {
  taskList = loadedTasks;
  // Start the server only after loading tasks
  app.listen(3000);
});


