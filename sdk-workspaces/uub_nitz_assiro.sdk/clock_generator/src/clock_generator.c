// UUB clock generatore initialization on I2C-1
#include <fcntl.h>
#include <stdio.h>
#include <linux/i2c-dev.h>

int main ()
{

	int file;

	char buf[]={0x00,0x20,
			0x01,0x01,0xB4,0x01,0x02,0x50,0x40,0x00,
            0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
            0x00,0x00,0x00,0x00,0x6D,0x02,0x00,0x00,
            0x99,0x03,0x32,0x68,0x00,0x40,0x02,0x08};

	int adapter_nr = 1; /* probably dynamically determined */
	char filename[20];
	printf("Initialization of I2C clock generator..... ");
	snprintf(filename, 19, "/dev/i2c-%d", adapter_nr);
	file = open(filename, O_RDWR);
	if (file < 0) {
			exit(1);
	}

	int addr = 0x65; /* The I2C address clock generator CDCE913*/

	if (ioctl(file, I2C_SLAVE, addr) < 0) {
			exit(2);
	}

    if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
    	 	exit(3);
     }

	printf("Done!\n\r");
}
