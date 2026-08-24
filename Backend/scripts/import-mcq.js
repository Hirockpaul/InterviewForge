const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { mcqSchema, normalizeMcq } = require('../src/services/mcqCore.services')
const mcqQuestionModel = require('../src/models/mcqQuestion.model')

function parseCsv(text) {
    const rows=[];let row=[],field='',quoted=false
    for(let index=0;index<text.length;index+=1){const char=text[index];if(char==='"'&&quoted&&text[index+1]==='"'){field+='"';index+=1}else if(char==='"')quoted=!quoted;else if(char===','&&!quoted){row.push(field);field=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[index+1]==='\n')index+=1;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field=''}else field+=char}if(field||row.length){row.push(field);rows.push(row)}
    const headers=rows.shift()?.map(item=>item.trim())||[]
    return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]||'']))).map(item=>({...item,options:[item.optionA,item.optionB,item.optionC,item.optionD],correctOption:Number(item.correctOption),tags:String(item.tags||'').split('|').filter(Boolean)}))
}

async function run(){const sourcePath=process.argv[2];if(!sourcePath)throw new Error('Usage: npm run import:mcq -- path/to/questions.json|csv');const absolute=path.resolve(sourcePath),extension=path.extname(absolute).toLowerCase(),text=fs.readFileSync(absolute,'utf8');const raw=extension==='.json'?JSON.parse(text):extension==='.csv'?parseCsv(text):null;if(!raw)throw new Error('Only JSON and CSV files are supported.');const values=Array.isArray(raw)?raw:raw.questions;if(!Array.isArray(values))throw new Error('Input must be an array or an object with a questions array.');require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});await mongoose.connect(process.env.MONGO_URI);let inserted=0,rejected=0,duplicates=0;for(const value of values){const parsed=mcqSchema.safeParse(value);if(!parsed.success){rejected+=1;console.warn(`Rejected: ${parsed.error.issues[0].message}`);continue}const document=normalizeMcq(parsed.data,{source:value.source||'imported',sourceReference:value.sourceReference||absolute,license:value.license||'',visibility:'global',qualityStatus:'approved'});try{await mcqQuestionModel.create(document);inserted+=1}catch(error){if(error.code===11000)duplicates+=1;else{rejected+=1;console.warn(`Rejected: ${error.message}`)}}}console.log(JSON.stringify({total:values.length,inserted,duplicates,rejected},null,2));await mongoose.disconnect()}
if(require.main===module)run().catch(error=>{console.error(error.message);process.exit(1)})
module.exports={parseCsv}
