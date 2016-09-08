// led shot generator
#include <fcntl.h>
#include <stdio.h>
#include <linux/i2c-dev.h>
#include <unistd.h>
#include <sys/mman.h>
#include <stdlib.h>
#define DAC_ADDR		0x0C // DAC slave address DAC AD5316
int file;
int dac_led1, dac_led2, dac_led3, dac_led4;


int main(int argc, char *argv[])
{
	if (argc == 1) {
		 dac_led1 = 400;//argv[1];//valore canale 1 dac led
		 dac_led3 = 400;//argv[2];//valore canale 3 dac led
		// USCITA PX4
		 dac_led2 = 600;//argv[3];//valore canale 2 dac led
		 dac_led4 = 600;//argv[4];//valore canale 4 dac led
		 printf("Default LED values %d  %d  %d  %d\n",dac_led1,dac_led2,dac_led3,dac_led4);
	}
	else if (argc < 5 || argc > 6){
		usage();
	}
	else {
		dac_led1 = atoi (argv[1]);
		dac_led2 = atoi (argv[2]);
		dac_led3 = atoi (argv[3]);
		dac_led4 = atoi (argv[4]);
		printf("LED values %d  %d  %d  %d\n",dac_led1,dac_led2,dac_led3,dac_led4);
	}

	int fd, file,i,j, Status, data_trig;
	int int_trig =  0x41200000;
	int value = 0;
	unsigned page_addr, page_offset;
	void *ptrt;
	unsigned page_size=sysconf(_SC_PAGESIZE);
	page_offset = 16;
	char buf[]={0x02,0x73,0x50};
	char filename[20];

   	printf("Initialization of I2C LED DAC..... ");
	snprintf(filename, 19, "/dev/i2c-0");
	file = open(filename, O_RDWR);
	if (file < 0) {
			exit("no open file");
	}
	if (ioctl(file, I2C_SLAVE, DAC_ADDR) < 0) {
			exit("Fail to setup slave addr!");
	}
    // Preparo i byte da inviare in buf
     // calcolo canale 1
     	buf[0] = 0x01;	//Seleziono canale del DAC
     	buf[1] = (dac_led1/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led1 & 0x3F)*4;
    	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
        	 	exit(3);
         	}
     	usleep(500);
     // calcolo canale 2
     	buf[0] = 0x02;	//Seleziono canale del DAC
     	buf[1] = (dac_led2/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led2 & 0x3F)*4;
     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	       exit(3);
     	}
     	usleep(500);
     // calcolo canale 3
     	buf[0] = 0x04;	//Seleziono canale del DAC
     	buf[1] = (dac_led3/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led3 & 0x3F)*4;
     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	       exit(3);
     	}
     	usleep(500);
     // calcolo canale 4
     	buf[0] = 0x08;	//Seleziono canale del DAC
     	buf[1] = (dac_led4/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led4 & 0x3F)*4;
     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	    exit(3);
     	}
     	printf("Done!\n");

     	fd = open ("/dev/mem", O_RDWR);
     	page_addr = (int_trig & (~(page_size-1)));
     	page_offset = int_trig - page_addr;
     	ptrt = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);

     	printf("LED Pulse is running... ");
     	while(1)
     	{
     		value = 0b00000100; //Bit 2 led shot from system
     		*((unsigned *)(ptrt + page_offset)) = value;// Write value to the device register
     		usleep(1);
     		value = 0b00000000;
     		*((unsigned *)(ptrt + page_offset)) = value;
     		usleep (200000);
     	}


}

void usage(void)
{
	printf("|    led <val LED1> <val LED2> <val LED3> <val LED4>\n");
	printf("|    val is number of DAC counting <0...1023>\n");
	printf("|    example: led 500 500 300 300\n");

	exit(1);
}
