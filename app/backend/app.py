from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import config
import os

# Create Flask application
app = Flask(__name__)
app.config.from_object(config[os.getenv('FLASK_ENV', 'default')])

db = SQLAlchemy(app)
migrate = Migrate(app, db)

from models import HealthData, ReminderLocation

@app.route('/submit_health_data', methods=['POST'])
def submit_health_data():
    data = request.get_json()
    sleep_time = data.get('sleep_time')
    drink_count = data.get('drink_count')
    height = data.get('height')
    weight = data.get('weight')

    # Check if required data exists before saving
    if height is not None and weight is not None:
        new_data = HealthData(sleep_time=sleep_time, drink_count=drink_count, height=height, weight=weight)
        db.session.add(new_data)
        db.session.commit()
        return jsonify({'message': 'Data submitted successfully'}), 200
    else:
        return jsonify({'message': 'Height and weight are required'}), 400

@app.route('/submit_locations', methods=['POST'])
def submit_locations():
    data = request.get_json()
    locations = data.get('locations')
    
    # Validate locations data
    if not locations:
        return jsonify({'message': 'Incomplete data'}), 400

    try:
        # Delete old locations before adding new ones to keep data in sync
        db.session.query(ReminderLocation).delete()
        for loc in locations:
            new_location = ReminderLocation(
                name=loc['name'],
                lat=loc['lat'],
                lng=loc['lng'],
                type=loc['type']
            )
            db.session.add(new_location)
        
        db.session.commit()
        return jsonify({'message': 'Locations saved successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Save failed: {str(e)}'}), 500

@app.route('/get_locations', methods=['GET'])
def get_locations():
    # Query all reminder locations
    locations = ReminderLocation.query.all()
    result = [{'id': loc.id, 'name': loc.name, 'lat': loc.lat, 'lng': loc.lng, 'type': loc.type} for loc in locations]
    return jsonify(result), 200

@app.route('/delete_location/<int:id>', methods=['DELETE'])
def delete_location(id):
    try:
        # Find location by ID and delete if exists
        location = ReminderLocation.query.get(id)
        if location:
            db.session.delete(location)
            db.session.commit()
            return jsonify({'message': 'Location deleted successfully'}), 200
        else:
            return jsonify({'message': 'Location not found'}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Deletion failed: {str(e)}'}), 500

if __name__ == '__main__':
    # Run Flask app, listening on all interfaces, debug enabled
    app.run(debug=True, host='0.0.0.0')
