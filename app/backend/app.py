from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import config
import os

# 创建Flask应用
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

    if sleep_time and drink_count:
        new_data = HealthData(sleep_time=sleep_time, drink_count=drink_count, height=height, weight=weight)
        db.session.add(new_data)
        db.session.commit()
        return jsonify({'message': '数据提交成功'}), 200
    else:
        return jsonify({'message': '数据不完整'}), 400

@app.route('/submit_locations', methods=['POST'])
def submit_locations():
    data = request.get_json()
    locations = data.get('locations')
    
    if not locations:
        return jsonify({'message': '数据不完整'}), 400

    try:
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
        return jsonify({'message': '地点保存成功'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'保存失败: {str(e)}'}), 500

@app.route('/get_locations', methods=['GET'])
def get_locations():
    locations = ReminderLocation.query.all()
    result = [{'id': loc.id, 'name': loc.name, 'lat': loc.lat, 'lng': loc.lng, 'type': loc.type} for loc in locations]
    return jsonify(result), 200

@app.route('/delete_location/<int:id>', methods=['DELETE'])
def delete_location(id):
    try:
        location = ReminderLocation.query.get(id)
        if location:
            db.session.delete(location)
            db.session.commit()
            return jsonify({'message': '地点删除成功'}), 200
        else:
            return jsonify({'message': '地点未找到'}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'删除失败: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
