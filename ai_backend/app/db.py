from pymongo import MongoClient
from .config import MONGO_URI, DB_NAME, COLLECTION_NAME

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
conversations = db[COLLECTION_NAME]
