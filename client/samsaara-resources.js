/*!
 * Samsaara Client Resource Module
 * Copyright(c) 2014 Arjun Mehta <arjun@newlief.com>
 * MIT Licensed
 */


var samaaraResources = function(options){

  var resourceDebug = debug('samsaara:resources');

  var core,
      samsaara,
      attributes;

  var resources = {};


  // exposed

  function resource(resourceID){
    if(resources[resourceID] !== undefined){
      return resources[resourceID];
    }
    else{
      resources[resourceID] = new Resource(resourceID);
      return resources[resourceID];
    }
  }

  function Resource(resourceID){
    this.id = resourceID;
  }

  Resource.prototype.execute = function(){
    var packet = {func: arguments[0], args: []};
    packet = core.processPacket(packet, arguments);
    core.send( packet, "RSRC:"+this.id);
  };

  return function resources(samsaaraCore, samsaaraAttributes){

    core = samsaaraCore;
    samsaara = samsaaraCore.samsaara;
    attributes = samsaaraAttributes;

    var exported = {
      
      internalMethods: {},
      initializationMethods: {},
      messageRoutes: {},
      main: {
        resource: resource
      }

    };

    return exported;

  };
};


samsaara.use(samaaraResources());

