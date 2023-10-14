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
  fs.readdir(readingPath, (err, files) => {

    const tasks = [];

    function readFile(index) {
      if (index >= files.length) {
        // All files have been read, call the callback with the tasks
        callback(tasks);
        return;
      }

      const filePath = path.join(readingPath, files[index]);
      fs.readFile(filePath, 'utf8', (err, data) => {
        const taskData = JSON.parse(data);
        const task = new Task(taskData);
        tasks.push(task);
        

        // Read the next file
        readFile(index + 1);
      });
    }

    // Start reading files from the first one
    readFile(0);
  });
}


/**
 * app.get() functions below
 */



app.get('/', (req, res) => {
  loadTasks((loadedTasks) => {
    taskList = loadedTasks;

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
});


app.get('/filter', (req, res) => {
  loadTasks((loadedTasks) => {
    taskList = loadedTasks;

    // Get the filter criteria from the query parameters
    const titleQ = req.query['titleQ'];
    const tagQ = req.query['tagQ'];


    if(titleQ && tagQ){
      taskList = taskList.filter(task => task.title.toLowerCase().includes(titleQ.toLowerCase()));
      taskList = taskList.filter(task => task.tags.includes(tagQ));
    }
    else{
      // Apply the title filter if titleQ is provided
      if (titleQ) {
        taskList = taskList.filter(task => task.title.toLowerCase().includes(titleQ.toLowerCase()));
      }

      // Apply the tag filter if tagQ is provided
      if (tagQ) {
        taskList = taskList.filter(task => task.tags.includes(tagQ));
      }

    }
    // Render the updated task list
    res.render('index', { tasks: taskList });
  });
});


app.get('/add', (req, res) => {
  res.render('index');
});

app.listen(3000);


