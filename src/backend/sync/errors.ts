export class CloudLoginRequiredError extends Error {
  constructor(message = "Cloud sync requires signing in to Scriptony Cloud.") {
    super(message);
    this.name = "CloudLoginRequiredError";
  }
}

export class CloudSyncAlreadyActiveError extends Error {
  constructor(message = "Cloud sync is already enabled for this project.") {
    super(message);
    this.name = "CloudSyncAlreadyActiveError";
  }
}
