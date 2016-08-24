import moment from 'moment';

//By default, moment parses and displays in local time.
//If you want to parse or display a moment in UTC, you can use moment.utc() instead of moment().

const getUTCMillisFromDate = (date, format) => {  
  return moment.utc(date, format).valueOf();  
}

const getEventStartDate = (event, timezone) => {
  return moment.tz(event.startsAt, timezone).format('MMMM Do');        
}

const getEventStartTime = (event, timezone) => {
  return moment.tz(event.startsAt, timezone).format('h:mm a');
}

const getEventEndTime = (event, timezone) => {
  const endMillis = null == event.duration ? null : event.startsAt + event.duration;      
  return null == endMillis ? null : moment.tz(endMillis, timezone).format('h:mm a');      
}

export default{
  getUTCMillisFromDate: getUTCMillisFromDate,
  getEventEndTime: getEventEndTime,
  getEventStartTime: getEventStartTime,
  getEventStartDate: getEventStartDate  
}
