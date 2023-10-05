/**
 * An Task Object
 */
class Task {
  /**
   * @param {Object} task, with appropriate fields of a task
   */
  constructor(task) {
    this['due-date'] = this.formatDate(new Date(task['due-date']));
    // TODO: add more fields required
  }

  /**
   * TODO: this function tests if the Task has the given tag
   * @param {String} tag, the given single tag to be checked
   */
  hasTag(tag) {
  }

  /**
   * this function convert a Date Object to a "yyyy-mm-dd" format string
   * @param {Date} date
   * @return {String} "yyyy-mm-dd" format string
   */
  formatDate(date) {
    const year = date.getFullYear();
    // Adding 1 because getMonth() is zero-based
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export {
  Task,
};
