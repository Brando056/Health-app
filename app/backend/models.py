from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Health data model
class HealthData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sleep_time = db.Column(db.String(20))
    drink_count = db.Column(db.Integer)
    height = db.Column(db.Float)
    weight = db.Column(db.Float)

    def __repr__(self):
        return f'<HealthData sleep_time={self.sleep_time}, drink_count={self.drink_count}, height={self.height}, weight={self.weight}>'

# Reminder location model
class ReminderLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Location name
    lat = db.Column(db.Float, nullable=False)  # Latitude
    lng = db.Column(db.Float, nullable=False)  # Longitude
    type = db.Column(db.String(20), nullable=False)  # Reminder type (sedentary/drink water)

    def __repr__(self):
        return f'<ReminderLocation name={self.name}, type={self.type}>'
