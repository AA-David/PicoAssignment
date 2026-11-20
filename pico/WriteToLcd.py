import time
from machine import I2C, Pin
from I2C_LCD import I2CLcd

class WriteToLcd:
	i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=400000)
	devices = i2c.scan()
	lcd = I2CLcd(i2c, devices[0], 2, 16)
	
	def write(self, row, message):
		message = message.upper()
		self.lcd.clear()
		self.lcd.move_to(0, row)
		if len(message) > 16:
			self.scroll(row, message)
		else:
			self.lcd.putstr(message)

	# https://microcontrollerslab.com/i2c-lcd-arduino-tutorial/
	def scroll(self, row, message, delay_time=0.3, total_columns=16):
		message = " " * total_columns + message + " - " + message + " "
		for position in range(len(message)):
			self.lcd.move_to(0, row)
			self.lcd.putstr(message[position:position + total_columns])
			time.sleep(delay_time)
