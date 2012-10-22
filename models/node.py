import uuid

from collections import OrderedDict
from google.appengine.api import memcache

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

