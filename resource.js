/*!
 * samsaaraSocks - Resource Constructor
 * Copyright(c) 2013 Arjun Mehta <arjun@newlief.com>
 * MIT Licensed
 */



// hold the samsaaraCore and samsaara objects

var core, 
    samsaara;


// the list of all other resources on this process

var resources;


function initialize(samsaaraCore, resourcesObj){

  core = samsaaraCore;
  samsaara = samsaaraCore.samsaara;

  resources = resourcesObj;

  return Resource;
}


function Resource(resourceID, resource, autoExpose){  
  this.id = resourceID;
  this.data = resource;

  samsaara.createNamespace("RSRC_"+resourceID);

  if(autoExpose === true){
    autoExposeResourceMethods(resourceID, resource);
  }
}

Resource.prototype.expose = function(exposed){
  samsaara.nameSpace("RSRC_"+this.id).expose(exposed);
};

function autoExposeResourceMethods(resourceID, resource){
  var exposed = {};
  for(var propName in resource){
    if(typeof resource[propName] === "function"){
      exposed[propName] = resource[propName];
    }
  }

  console.log("EXPOSED Namespace Methods", "RSRC_"+resourceID, samsaara.nameSpace("RSRC_"+resourceID));

  
  samsaara.nameSpace("RSRC_"+resourceID).expose(exposed);

  console.log("EXPOSED Namespace Methods", "RSRC_"+resourceID, samsaara.nameSpace("RSRC_"+resourceID));

}


module.exports = exports = {
  initialize: initialize,
  Resource: Resource
};