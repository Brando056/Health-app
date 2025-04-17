from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import config
import os

# 创建Flask应用
app = Flask(__name__)
# 加载配置
app.config.from_object(config[os.getenv('FLASK_ENV', 'default')])

# 初始化数据库和迁移工具
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# 导入模型
from models import HealthData

# 处理数据提交的API
@app.route('/submit_health_data', methods=['POST'])
def submit_health_data():
    data = request.get_json()
    sleep_time = data.get('sleep_time')
    drink_count = data.get('drink_count')

    if sleep_time and drink_count:
        new_data = HealthData(sleep_time=sleep_time, drink_count=drink_count)
        db.session.add(new_data)
        db.session.commit()
        return jsonify({'message': '数据提交成功'}), 200
    else:
        return jsonify({'message': '数据不完整'}), 400

# 获取健康数据的API
@app.route('/get_health_data', methods=['GET'])
def get_health_data():
    data = HealthData.query.all()
    result = [{'id': d.id, 'sleep_time': d.sleep_time, 'drink_count': d.drink_count} for d in data]
    return jsonify(result), 200

if __name__ == '__main__':
    app.run(debug=True)