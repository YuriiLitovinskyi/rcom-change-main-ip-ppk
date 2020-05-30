const MongoClient = require('mongodb').MongoClient;
const prompts = require('prompts');
const chalk = require('chalk');

const url = 'mongodb://localhost:27017/DBClientsPPK';

const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gm;

(() => {
    MongoClient.connect(url, async (err, db) => {
        if(err) {            
            console.log(chalk.red('No connection to Database! Please start MongoDB service on default port 27017!\n'));                       
            
            console.log(err);
            await sleep(10000);           
        } else {
            console.log(chalk.green('Connected to database successfully!\n')); 

            (async () => {            
                const ppkNumber = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter ppk number: ',
                    validate: value => value <= 0 || value > 100000 ? `Please enter a valid ppk number from 1 to 100000` : true
                });

                const ppkPassword = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter ppk password: ',
                    validate: value => value < 100000 || value > 999999 ? `Please enter a valid ppk password from 100000 to 999999` : true
                });

                console.log(' ');

                const ppkNewIp = await prompts({
                    type: 'text',
                    name: 'value',
                    message: 'Enter new main ppk IP: ',
                    validate: value => !ipRegex.exec(value) ? `Please enter a valid ip address` : true
                });

                const ppkNewPort = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter new main ppk Port: ',
                    validate: value => value <= 0 || value > 65535 ? `Please enter a valid port from 1 to 65535` : true
                });
    
                validateAndSendIpPort(db, ppkNumber.value, ppkPassword.value, ppkNewIp.value, ppkNewPort.value);
            })();
        };       
    });
})();


const sleep = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);        
    });
};

const validateAndSendIpPort = (db, ppkNum, ppkPass, ppkNewIp, ppkNewPort) => {
    db.collection('ppkState', async (err, collection) => {
        if(err) {
            console.log(err);
            db.close();
            await sleep(10000);
        };

        const ppk = await collection.find({ ppk_num: ppkNum }).toArray();
        
        if (ppk.length === 0){
            console.log(`\nPpk number ${ppkNum} wasn't found in database...`);
            console.log(chalk.magenta('Application will be closed automatically in 10 seconds'));
            db.close();
            await sleep(10000);
        } else if (ppk[0].lastActivity && ppk[0].lastActivity < (Date.now() - 4 * 60 * 1000)){
            console.log(`\nPpk number ${ppkNum} is offline at the moment...`);
            console.log(chalk.magenta('Application will be closed automatically in 10 seconds'));
            db.close();
            await sleep(10000);
        } else {
            sendNewIpPort(db, ppkNum, ppkPass, ppkNewIp, ppkNewPort, async () => {                      
                    console.log(`\nCommand to change main ip and port was successfully sent to ppk number ${ppkNum}`);
                    console.log(chalk.magenta('Application will be closed automatically in 20 seconds'));

                    db.close();    
                    await sleep(20000);                     
            });
        }       
    });
};

const sendNewIpPort = (db, ppk_num, ppk_pass, ppk_newIp, ppk_newPort, callback) => {
    db.collection('ppkCommandQueue', async (err, collection) => {
        if(err) {
            console.log(err);
            db.close();
            await sleep(10000);
        };
        
        await collection.insertOne({
            block: 1, 
            ppkNum : ppk_num,
            message: "WRITE_CONFIG",
            time: Date.now(),            
            password: ppk_pass.toString(),
            configData: {
                n: ppk_num.toString(),
                i: ppk_newIp,
                p: ppk_newPort.toString(),
                a: "internet",
                q: "internet"
            }
        }, async (err, result) => {
            if(err){
                console.log(err);
                db.close();
                await sleep(10000);
            };         
            console.log(`${result}\n`);
            //createRequest4L(db, ppk_num)
        });
        callback();
    });
};
