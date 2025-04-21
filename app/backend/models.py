from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# 健康数据模型
class HealthData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sleep_time = db.Column(db.String(20))
    drink_count = db.Column(db.Integer)
    height = db.Column(db.Float)
    weight = db.Column(db.Float)

    def __repr__(self):
        return f'<HealthData sleep_time={self.sleep_time}, drink_count={self.drink_count}, height={self.height}, weight={self.weight}>'

# 提醒地点模型
class ReminderLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # 地点名称
    lat = db.Column(db.Float, nullable=False)  # 纬度
    lng = db.Column(db.Float, nullable=False)  # 经度
    type = db.Column(db.String(20), nullable=False)  # 提醒类型（久坐/饮水）

    def __repr__(self):
        return f'<ReminderLocation name={self.name}, type={self.type}>'
