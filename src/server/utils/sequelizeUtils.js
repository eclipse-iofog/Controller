import _ from 'underscore';

//src, destination
//destination should be a sequzlize object
const updateObject  = (destination, source) => {

  _.each(source, (value, key) => {            
      if(key != 'id' && key != 'createdAt' && _.has(destination.dataValues, key)){        
        if(destination[key] != source[key])
          destination[key] = source[key];
      }
  });
};

export default {
  updateObject: updateObject
}
