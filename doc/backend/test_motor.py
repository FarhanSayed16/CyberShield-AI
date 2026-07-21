import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.db.connection import init_db
from app.db.models import ThreatEventDocument

async def run():
    await init_db()
    attrs = dir(ThreatEventDocument)
    for attr in attrs:
        if "collection" in attr.lower():
            print("Found collection attr:", attr)
    if hasattr(ThreatEventDocument, "get_motor_collection"):
        print("has get_motor_collection")

if __name__ == "__main__":
    asyncio.run(run())
