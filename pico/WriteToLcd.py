from machine import I2C, Pin
from I2C_LCD import I2CLcd

class WriteToLcd:
	i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=400000)
	devices = i2c.scan()
	lcd = I2CLcd(i2c, devices[0], 2, 16)
	prevMessage_row0 = None
	prevMessage_row1 = None
	
	def write(self, row, message):
		message = message.upper()
		if row == 0 and self.prevMessage_row0 == message:
			return
		if row == 1 and self.prevMessage_row1 == message:
			return

		if row == 0:
			self.lcd.clear()
			WriteToLcd.prevMessage_row0 = None
			WriteToLcd.prevMessage_row1 = None
			WriteToLcd.prevMessage_row0 = message
		else:
			WriteToLcd.prevMessage_row1 = message

		self.lcd.move_to(0, row)
		self.lcd.putstr(message)