const azure = require('azure');
const inquirer = require('inquirer');

try {
  let config = require('./config.json');
  for (var prop in config) {
      if (config.hasOwnProperty(prop)) {
          process.env[prop] = config[prop];
      }
  }
} catch (err) {
  console.error('No local config present.');
}

async function receiveAndDeleteOneMessageOnQueue(serviceBusService, queueName) {
	return new Promise(function(resolve, reject) {
		serviceBusService.receiveQueueMessage(queueName, function(error, message){
			if(error){
				console.error('Error when retriving and deleting message:' + error);
				reject(error);
			} else {
				resolve();
			}
		});
	});
}

async function deleteEverythingOnQueue(serviceBusService, queueName) {
	let deleteCount = 0;
	try {
		while (true) {
			await receiveAndDeleteOneMessageOnQueue(serviceBusService, queueName);
			deleteCount += 1;
		}
	} catch (err) {
		console.error('Failed to delete message on queue:' +  err);
	}
	return deleteCount;
}

if (process.env.AZURE_SERVICEBUS_CONNECTION_STRING) {
	console.log('Found connection string.');
	
	let queueName = process.argv[2];
	if (queueName) {
		console.log('Found queue name: ' + queueName);
		
		let serviceBusService = azure.createServiceBusService();
		
		serviceBusService.getQueue(queueName, (error, result, response) => {
			if (error) {
				console.error('Error when fetching queue:' + error);
			} else if (result) {
				console.log('Found queue in Azure with ' + 
					result.CountDetails['d2p1:ActiveMessageCount'] + ' active messages.');
				inquirer
					.prompt([{
						type: 'input',
						name: 'clean_response',
						message: 'Do you want to continue? (Y/N)' }])
					.then(answers => {
						if (answers.clean_response.toLowerCase() === 'y') {
							deleteEverythingOnQueue(serviceBusService, queueName)
								.then(deleteCount => {
									console.log('Deleted ' + deleteCount + ' on queue.');
								})
								.catch(error => {
									console.error('Error when deleting all messages:' + error);
								});
						}
					})
					.catch(error => console.error('Failed to read from user: ' + error));
			} else {
				console.error('Found no queue with that name.');
			}
		});
		
		
	} else {
		console.log('Provide name of Azure queue that should be emptied.');
	}
} else {
	console.error('Found no connection string in AZURE_SERVICEBUS_CONNECTION_STRING.');
}