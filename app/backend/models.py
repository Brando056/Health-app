from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# 健康数据模型
class HealthData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sleep_time = db.Column(db.String(20))
    drink_count = db.Column(db.Integer)

    def __repr__(self):
        return f'<HealthData sleep_time={self.sleep_time}, drink_count={self.drink_count}>'