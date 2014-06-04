/*!
 * Samsaara Groups Module
 * Copyright(c) 2013 Arjun Mehta <arjun@newlief.com>
 * MIT Licensed
 */

// RULES
// Resource IDs must be unique, globally


var debug = require('debug')('samsaara:resources');
var debugError = require('debug')('samsaara:resources:error');


function resourceController(options){

  var core,
      samsaara,
      connectionController,
      communication,
      ipc;

  var connections;

  var resources = {};
  var Resource;


  // main

  function createResource(resourceID, resource, autoExpose, callBack){
    if(typeof autoExpose === "function"){
      callBack = autoExpose;
      autoExpose = undefined;
    }

    if(resources[resourceID] === undefined){
      resources[resourceID] = new Resource(resourceID, resource, autoExpose);
      if(typeof callBack === "function") callBack(null, resources[resourceID]);
    }
    else{
      if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" exists"), null);
    }
  }

  function createResourceIPC(resourceID, resource, autoExpose, callBack){


    debug("Creating Resource");

    if(typeof autoExpose === "function"){
      callBack = autoExpose;
      autoExpose = undefined;
    }

    if(resources[resourceID] === undefined){
      ipc.store.hexists("samsaara:resourceOwners", resourceID, function (err, exists){
        if(~~exists === 1){
          if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" exists"), null);
        }
        else{
          ipc.store.hset("samsaara:resourceOwners", resourceID, core.uuid, function(err, reply){
            resources[resourceID] = new Resource(resourceID, resource, autoExpose);
            samsaara.emit("newResource", resources[resourceID]);
            if(typeof callBack === "function") callBack(null, resources[resourceID]);
          });
          
        }
      });
    }
    else{
      if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" exists"), null);
    }
  }


  // function removeResource(resourceID, callBack){

  //   if(resources[resourceID] === undefined){
  //     resources[resourceID] = new Resource(resource, resourceID);
  //     if(typeof callBack === "function") callBack(null, resources[resourceID]);
  //   }
  //   else{
  //     if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" exists"), null);
  //   }
  // }

  // function removeResourceIPC(resourceID, callBack){

  //   if(resources[resourceID] === undefined){
  //     ipc.store.hget("samsaara:resourceOwners", resourceID, function (err, ownerID){
  //       if(ownerID !== null){
  //         samsaara.process(ownerID).execute("removeResource", resourceID, callBack);
  //         if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" exists"), null);
  //       }
  //       else{
  //         samsaara.emit("removedResource", resources[resourceID]);
  //         delete resources[resourceID];
  //         if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" doesn't exists"), null);         
  //       }
  //     });
  //   }
  //   else{
  //     if(typeof callBack === "function") callBack(new Error("Resource "+resourceID+" exists"), null);
  //   }
  // }




  function resource(resourceID){
    return resources[resourceID];
  }

  function resourceIPC(resourceID){
    if(resources[resourceID] !== undefined){
      return resources[resourceID];
    }
    else{
      return {

      };
    }
  }


  // Routing Methods including IPC handling

  function route(connection, headerbits, message){

    var resourceID = headerbits[1];

    if(resourceID !== undefined && resources[resourceID] !== undefined){
      var messageObj = parseJSON(message);
      if(messageObj !== undefined){
        communication.executeFunction(connection, resources[resourceID].data, messageObj);
      }
    }
  }


  function routeIPC(connection, headerbits, message){

    var resourceID = headerbits[1];

    if(resources[resourceID] === undefined){
      ipc.store.hget("samsaara:resourceOwners", resourceID, function (err, ownerID){
        if(ownerID !== null){
          if(connection.symbolicOwners[ownerID] !== undefined){
            ipc.publish("PRC:"+ownerID+":RSRCFWD", "RSRC:"+resourceID+":FRM:"+connection.id+"::"+message);
          }
          else{
            ipc.process(ownerID).createSymbolic(connection, function (err){
              ipc.publish("PRC:"+ownerID+":RSRCFWD", "RSRC:"+resourceID+":FRM:"+connection.id+"::"+message);
            });
          }
        }
      });
    }
    else{
      var messageObj = parseJSON(message);

      if(messageObj !== undefined){
        messageObj.sender = connection.id;
        messageObj.ns = "RSRC_"+resourceID;
        debug("Executing Resource Message", JSON.stringify(messageObj), resourceID, headerbits);
        communication.executeFunction(connection, resources[resourceID].data, messageObj);
      }
    }
  }



  // double parsing (header and body)... can we combine them somehow?

  function handleResourceMessage(channel, message){

    debug("Handling Resource Message", core.uuid, channel, message);

    var index = message.indexOf("::");
    var senderInfoSplit = message.split(":");
    var connMessage = message.slice(2+index-message.length);

    var resourceID = senderInfoSplit[1];
    var connID = senderInfoSplit[3];

    var connection = connections[connID] || {id: connID};
    var resource = resources[resourceID];

    if(resource !== undefined){

      var messageObj = JSON.parse(connMessage);
      messageObj.ns = "RSRC_"+resourceID;
      messageObj.sender = connID;

      communication.executeFunction(connection, resource.data, messageObj);
    }
  }



  // Module Return Function.
  // Within this function you should set up and return your samsaara middleWare exported
  // object. Your eported object can contain:
  // name, foundation, remoteMethods, connectionInitialization, connectionClose

  return function resourceController(samsaaraCore){

    core = samsaaraCore;
    samsaara = samsaaraCore.samsaara;
    connectionController = samsaaraCore.connectionController;
    communication = samsaaraCore.communication;
    ipc = samsaaraCore.ipc;
    connections = connectionController.connections;

    samsaaraCore.addClientFileRoute("samsaara-resources.js", __dirname + '/client/samsaara-resources.js');

    var exported = {

      name: "resources",

      clientScript: __dirname + '/client/samsaara-resources.js',

      main: {
        resource: resource,
        createResource: createResource,
        resources: resources
      },

      messageRoutes: {
        RSRC: route
      },

      remoteMethods: {},
      connectionInitialization: {},
      connectionClose: {},
      constructors: {},
      testable: {}

    };

    if(samsaaraCore.capability.ipc === true){

      ipc.addRoute("ResourceExecutionFromNonNative", "PRC:"+core.uuid+":RSRCFWD", handleResourceMessage);

      exported.main.resource = resourceIPC;
      exported.main.createResource = createResourceIPC;
      exported.messageRoutes.RSRC = routeIPC;
    }

    Resource = require('./resource').initialize(samsaaraCore, resources);
    exported.constructors.Resource = Resource;

    return exported;

  };

}


function parseJSON(jsonString){
  var parsed;

  try{
    parsed = JSON.parse(jsonString);
  }
  catch(e){
    debug("Message Error: Invalid JSON", jsonString, e);
  }

  return parsed;
}


module.exports = exports = resourceController;
